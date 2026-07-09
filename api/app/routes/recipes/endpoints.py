import html
import ipaddress
import re
import socket
from typing import Annotated
from urllib.parse import urljoin, urlsplit

import httpx
from api.app.database import get_session
from api.app.models import RecipeSourceType
from api.app.routes.recipes.schemas import (
    RecipeCreate,
    RecipeFilterValues,
    RecipeListResponse,
    RecipeRead,
)
from api.app.routes.recipes.utils import (
    count_recipes,
    create_recipe,
    get_filter_values,
    get_recipe,
    list_recipes,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter(prefix="/recipes", tags=["recipes"])
SessionDep = Annotated[Session, Depends(get_session)]


class RecipeImportUrlRequest(BaseModel):
    url: str = Field(min_length=5, max_length=2048)


MAX_RECIPE_PAGE_BYTES = 1_000_000
MAX_REDIRECTS = 3


def validate_public_recipe_url(url: str) -> None:
    """Reject URL targets that could reach local or private infrastructure."""
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide an absolute HTTP or HTTPS URL.",
        )

    try:
        addresses = socket.getaddrinfo(parsed.hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The recipe host could not be resolved.",
        ) from exc

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Recipe URLs must resolve to public internet hosts.",
            )


async def fetch_recipe_page(url: str) -> str:
    """Fetch bounded HTML from a public recipe URL, validating every redirect."""
    current_url = url
    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=httpx.Timeout(15.0),
        headers={"User-Agent": "Kombu Recipe Importer/1.0"},
    ) as client:
        for _ in range(MAX_REDIRECTS + 1):
            validate_public_recipe_url(current_url)
            async with client.stream("GET", current_url) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Recipe site returned an invalid redirect.",
                        )
                    current_url = urljoin(current_url, location)
                    continue

                if response.status_code >= 400:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Recipe site returned HTTP {response.status_code}.",
                    )
                content_type = response.headers.get("content-type", "")
                if "html" not in content_type.lower():
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="The URL did not return an HTML recipe page.",
                    )

                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > MAX_RECIPE_PAGE_BYTES:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="Recipe page is too large to import.",
                        )
                return body.decode(response.encoding or "utf-8", errors="replace")

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Recipe site redirected too many times.",
    )


def webpage_text(html_document: str) -> str:
    """Convert HTML to a bounded text payload suitable for extraction."""
    without_noncontent = re.sub(
        r"<(script|style|noscript)[^>]*>.*?</\1>",
        " ",
        html_document,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(r"<[^>]+>", " ", without_noncontent)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()[:12_000]


@router.get("", response_model=RecipeListResponse)
def index(
    session: SessionDep,
    search: str | None = Query(default=None, min_length=1),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    cuisine: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    sort_by: str = Query(default="updated_at"),
    sort_order: str = Query(default="desc"),
) -> RecipeListResponse:
    """List recipes stored in Kombu with filtering, sorting, and pagination."""
    total = count_recipes(
        session,
        search=search,
        cuisine=cuisine,
        source_type=source_type,
    )
    items = [
        RecipeRead.model_validate(recipe)
        for recipe in list_recipes(
            session,
            search=search,
            skip=skip,
            limit=limit,
            cuisine=cuisine,
            source_type=source_type,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    ]
    return RecipeListResponse(
        items=items,
        total=total,
        page=skip // limit + 1 if limit else 1,
        per_page=limit,
    )


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create(payload: RecipeCreate, session: SessionDep) -> RecipeRead:
    """Create a recipe."""
    recipe = create_recipe(session, payload)
    return RecipeRead.model_validate(recipe)


@router.get("/filters", response_model=RecipeFilterValues)
def filter_values(session: SessionDep) -> RecipeFilterValues:
    """Return distinct filter values for the recipe listing."""
    return get_filter_values(session)


@router.get("/{recipe_id}", response_model=RecipeRead)
def show(recipe_id: int, session: SessionDep) -> RecipeRead:
    """Return one recipe."""
    recipe = get_recipe(session, recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found."
        )
    return RecipeRead.model_validate(recipe)


@router.post(
    "/import-url",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
)
async def import_from_url(
    payload: RecipeImportUrlRequest,
    session: SessionDep,
) -> RecipeRead:
    """Fetch a public recipe URL, extract it through AI, and create a recipe."""
    from api.app.config import get_settings
    from api.app.services.ai import extract_web_recipe, has_available_provider

    if not get_settings().ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features are not enabled.",
        )
    if not has_available_provider():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No AI provider is enabled. Add one in Settings.",
        )

    page = await fetch_recipe_page(payload.url)
    try:
        extracted = await extract_web_recipe(webpage_text(page))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider could not extract the recipe: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The page did not produce a valid recipe.",
        ) from exc

    recipe = create_recipe(
        session,
        RecipeCreate(
            title=extracted.title,
            summary=extracted.summary,
            instructions=extracted.instructions,
            source_url=payload.url,
            source_type=RecipeSourceType.WEB,
            cuisine=extracted.cuisine,
            yield_servings=extracted.yield_servings,
            prep_minutes=extracted.prep_minutes,
            cook_minutes=extracted.cook_minutes,
            ingredients=[
                ingredient.model_dump() for ingredient in extracted.ingredients
            ],
        ),
    )
    return RecipeRead.model_validate(recipe)
