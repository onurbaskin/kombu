import {
  ArrowLeftIcon,
  ClockIcon,
  ExternalLinkIcon,
  UsersIcon,
  WandSparklesIcon,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";
import { RecipeDetailTopbar } from "~/components/recipe-detail-topbar";
import { RecipeEditor } from "~/components/recipe-editor";
import { SourceNotice } from "~/components/source-notice";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  getAiCapabilities,
  getRecipe,
  getRecipeEnhancement,
  getRecipeVersion,
  getRecipeVersions,
} from "~/lib/api/resources";
import { ingredientEditorData, parseEditorData } from "~/lib/editorjs";
import type { Route } from "./+types/recipe-detail";

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data?.recipe
        ? `${data.recipe.data.title} | Kombu`
        : "Recipe | Kombu",
    },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const recipeId = Number(params.id);
  if (Number.isNaN(recipeId)) {
    throw new Response("Not Found", { status: 404 });
  }
  const [recipe, enhancement, capabilities, versions] = await Promise.all([
    getRecipe(recipeId),
    getRecipeEnhancement(recipeId),
    getAiCapabilities(),
    getRecipeVersions(recipeId),
  ]);
  const versionId = Number(new URL(request.url).searchParams.get("version"));
  const version =
    versionId > 0 ? await getRecipeVersion(recipeId, versionId) : null;
  return { recipe, enhancement, capabilities, versions, version };
}

export const handle = { topbar: RecipeDetailTopbar };

export default function RecipeDetail({ loaderData }: Route.ComponentProps) {
  const { recipe: recipeResult, enhancement: enhancementResult } = loaderData;
  const recipe = recipeResult.data;
  const selectedVersion = loaderData.version?.data;
  const displayRecipe = selectedVersion ?? recipe;
  const enhancement = selectedVersion ? null : enhancementResult.data;
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLoading = navigation.state === "loading";

  const rawImageUrl = recipe.images?.[0]?.image_url ?? displayRecipe.image_url;
  const imageUrl = rawImageUrl
    ? rawImageUrl.startsWith("http://") ||
      rawImageUrl.startsWith("https://") ||
      rawImageUrl.startsWith("data:")
      ? rawImageUrl
      : `https://${rawImageUrl}`
    : null;

  const sourceUrl = recipe.source_url
    ? recipe.source_url.startsWith("http://") ||
      recipe.source_url.startsWith("https://")
      ? recipe.source_url
      : `https://${recipe.source_url}`
    : null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!recipe.id) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          to="/recipes"
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-4" />
          Back to recipes
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-lg font-medium">
            Recipe not found
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            This recipe may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SourceNotice results={[recipeResult]} />
      <Link
        to="/recipes"
        className="mb-6 inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to recipes
      </Link>

      <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {imageUrl && (
          <div className="aspect-video overflow-hidden border-b bg-muted">
            <img
              src={imageUrl}
              alt={displayRecipe.title}
              className="h-full w-full object-cover"
              onError={(event) => {
                (event.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="p-6 sm:p-8">
          {(loaderData.versions.data ?? []).length > 1 && (
            <label className="mb-4 flex max-w-sm flex-col gap-1 text-sm">
              <span className="font-medium">Recipe version</span>
              <select
                className="h-9 rounded-md border bg-background px-3"
                value={searchParams.get("version") ?? "0"}
                onChange={(event) => {
                  const value = event.target.value;
                  navigate(
                    value === "0"
                      ? `/recipes/${recipe.id}`
                      : `/recipes/${recipe.id}?version=${value}`,
                  );
                }}
              >
                {(loaderData.versions.data ?? []).map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.id === 0
                      ? "Original recipe"
                      : `${version.version_type} · ${new Date(version.created_at).toLocaleString()}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {recipe.is_favorite && <Badge variant="secondary">Favorite</Badge>}
            <Badge>
              {selectedVersion
                ? `${selectedVersion.version_type} version`
                : recipe.source_type}
            </Badge>
            {displayRecipe.cuisine && (
              <Badge variant="secondary">{displayRecipe.cuisine}</Badge>
            )}
          </div>
          <h1 className="font-display font-semibold text-3xl tracking-tight">
            {displayRecipe.title}
          </h1>

          {(enhancement?.summary || displayRecipe.summary) && (
            <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
              {enhancement?.summary ?? displayRecipe.summary}
            </p>
          )}

          {enhancement && (
            <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
              <WandSparklesIcon aria-hidden="true" />
              AI-generated version cached{" "}
              {new Date(enhancement.generated_at).toLocaleDateString()}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {displayRecipe.prep_minutes != null &&
              displayRecipe.cook_minutes != null && (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <ClockIcon className="size-4 text-muted-foreground" />
                  Prep: {displayRecipe.prep_minutes}m · Cook:{" "}
                  {displayRecipe.cook_minutes}m
                </div>
              )}
            {displayRecipe.yield_servings != null && (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <UsersIcon className="size-4 text-muted-foreground" />
                {displayRecipe.yield_servings} servings
              </div>
            )}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:text-primary"
              >
                <ExternalLinkIcon className="size-4 text-muted-foreground" />
                View source
              </a>
            )}
          </div>

          {(displayRecipe.ingredients ?? []).length > 0 && (
            <section className="mt-8 border-t pt-6">
              <h2 className="mb-3 font-semibold text-lg">Ingredients</h2>
              <RecipeEditor
                data={ingredientEditorData(displayRecipe.ingredients ?? [])}
                readOnly
              />
            </section>
          )}

          {(enhancement?.instructions || displayRecipe.instructions) && (
            <section className="mt-8 border-t pt-6">
              <h2 className="mb-3 font-semibold text-lg">Instructions</h2>
              <RecipeEditor
                data={parseEditorData(
                  enhancement?.instructions ?? displayRecipe.instructions,
                )}
                readOnly
              />
            </section>
          )}

          {enhancement && enhancement.tips.length > 0 && (
            <section className="mt-8 border-t pt-6">
              <h2 className="mb-3 font-semibold text-lg">Cook&apos;s notes</h2>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
                {enhancement.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
