import { LayoutGridIcon, ListIcon, PlusIcon, UploadIcon } from "lucide-react";
import { useNavigation, useSearchParams } from "react-router";
import { PageHeader } from "~/components/page-header";
import { RecipeCard } from "~/components/recipe-card";
import { RecipeFilters } from "~/components/recipe-filters";
import { RecipeTable } from "~/components/recipe-table";
import { SourceNotice } from "~/components/source-notice";
import { Button } from "~/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { getRecipeFilters, getRecipesPaginated } from "~/lib/api/resources";
import type { Route } from "./+types/recipes";

const PER_PAGE = 24;

export function meta() {
  return [{ title: "Recipes | Kombu" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const cuisine = url.searchParams.get("cuisine") ?? undefined;
  const source_type = url.searchParams.get("source_type") ?? undefined;
  const sort_by_term = url.searchParams.get("sort_by") ?? "updated_at";
  const sort_order_term = url.searchParams.get("sort_order") ?? "desc";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const [recipesResult, filtersResult] = await Promise.all([
    getRecipesPaginated({
      skip: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
      search,
      cuisine,
      source_type,
      sort_by: sort_by_term,
      sort_order: sort_order_term,
    }),
    getRecipeFilters(),
  ]);

  return { recipes: recipesResult, filters: filtersResult };
}

export default function Recipes({ loaderData }: Route.ComponentProps) {
  const { recipes, filters } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();

  const isLoading = navigation.state === "loading";

  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const searchValue = searchParams.get("search") ?? "";
  const activeCuisine = searchParams.get("cuisine") ?? undefined;
  const activeSourceType = searchParams.get("source_type") ?? undefined;
  const viewMode = searchParams.get("view") ?? "grid";

  const totalPages = Math.max(
    1,
    Math.ceil((recipes.data?.total ?? 0) / PER_PAGE),
  );

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page" && key !== "view") {
      next.delete("page");
    }
    setSearchParams(next, { preventScrollReset: true });
  };

  const handleSearch = (query: string) => {
    const next = new URLSearchParams(searchParams);
    if (query) {
      next.set("search", query);
    } else {
      next.delete("search");
    }
    next.delete("page");
    setSearchParams(next, { preventScrollReset: true, replace: true });
  };

  const buildHref = (overrides: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(overrides)) {
      next.set(key, value);
    }
    return `?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cookbook"
        title="Recipes"
        description="Browse, search, and filter your recipe collection."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/imports">
                <UploadIcon data-icon="inline-start" />
                Import recipes
              </a>
            </Button>
            <Button>
              <PlusIcon data-icon="inline-start" />
              New recipe
            </Button>
          </>
        }
      />

      <SourceNotice results={[recipes, filters]} />

      <div className="flex gap-6">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-22 flex flex-col gap-4 max-h-[calc(100vh-6rem)]">
            <RecipeFilters
              filters={filters.data}
              activeFilters={{
                cuisine: activeCuisine,
                source_type: activeSourceType,
                search: searchValue || undefined,
              }}
              onFilterChange={updateParam}
              onSearch={handleSearch}
              searchValue={searchValue}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground text-sm">
              {recipes.data?.total ?? 0} recipes found
            </p>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && updateParam("view", v)}
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGridIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view">
                <ListIcon className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                <div key={i} className="rounded-xl border p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : recipes.data && recipes.data.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground text-lg font-medium">
                No recipes yet
              </p>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                Your cookbook is empty. Capture your first recipe or{" "}
                <a href="/imports" className="underline hover:text-foreground">
                  import a recipe dataset
                </a>{" "}
                to get started.
              </p>
            </div>
          ) : (recipes.data?.items ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground text-lg font-medium">
                No recipes found
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Try adjusting your filters or search terms.
              </p>
            </div>
          ) : viewMode === "table" ? (
            <RecipeTable recipes={recipes.data?.items ?? []} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(recipes.data?.items ?? []).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildHref({
                      page: String(Math.max(1, currentPage - 1)),
                    })}
                    aria-disabled={currentPage <= 1}
                    tabIndex={currentPage <= 1 ? -1 : undefined}
                    className={
                      currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href={buildHref({ page: String(pageNum) })}
                        isActive={pageNum === currentPage}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    href={buildHref({
                      page: String(Math.min(totalPages, currentPage + 1)),
                    })}
                    aria-disabled={currentPage >= totalPages}
                    tabIndex={currentPage >= totalPages ? -1 : undefined}
                    className={
                      currentPage >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}
