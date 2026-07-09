import {
  LayoutGridIcon,
  Link2Icon,
  ListIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";
import {
  Link,
  useNavigate,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { RecipeCard } from "~/components/recipe-card";
import { RecipeFilters } from "~/components/recipe-filters";
import { RecipeTable } from "~/components/recipe-table";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  createRecipe,
  getRecipeFilters,
  getRecipesPaginated,
  importRecipeFromUrl,
} from "~/lib/api/resources";
import type { Route } from "./+types/recipes";

export const handle = {
  topbar: function RecipesTopbar() {
    const [searchParams, setSearchParams] = useSearchParams();
    const revalidator = useRevalidator();
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState(
      searchParams.get("search") ?? "",
    );
    const [importOpen, setImportOpen] = useState(false);
    const [importUrl, setImportUrl] = useState("");
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [newRecipeOpen, setNewRecipeOpen] = useState(false);
    const [newRecipeTitle, setNewRecipeTitle] = useState("");
    const [newRecipeImageUrl, setNewRecipeImageUrl] = useState("");
    const [newRecipeIngredients, setNewRecipeIngredients] = useState("");
    const [newRecipeError, setNewRecipeError] = useState<string | null>(null);
    const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);

    const handleSearch = (query: string) => {
      setSearchValue(query);
      const next = new URLSearchParams(searchParams);
      if (query) {
        next.set("search", query);
      } else {
        next.delete("search");
      }
      next.delete("page");
      setSearchParams(next, { preventScrollReset: true, replace: true });
    };

    const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      let url: URL;

      try {
        url = new URL(importUrl);
      } catch {
        setImportError("Enter a valid recipe URL.");
        return;
      }

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        setImportError("Enter an HTTP or HTTPS recipe URL.");
        return;
      }

      setIsImporting(true);
      setImportError(null);
      const result = await importRecipeFromUrl(url.toString());
      setIsImporting(false);
      const recipeId = result.data?.id;

      if (result.error || !recipeId) {
        setImportError(result.error ?? "Unable to import the recipe.");
        return;
      }

      setImportOpen(false);
      setImportUrl("");
      navigate(`/recipes/${recipeId}`);
    };

    const handleCreateRecipe = async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();
      setIsCreatingRecipe(true);
      setNewRecipeError(null);
      const result = await createRecipe({
        title: newRecipeTitle,
        image_url: newRecipeImageUrl || null,
        source_type: "user",
        is_favorite: false,
        ingredients: newRecipeIngredients
          .split("\n")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
      });
      setIsCreatingRecipe(false);
      if (result.error || !result.data.id) {
        setNewRecipeError(result.error ?? "Unable to create the recipe.");
        return;
      }
      setNewRecipeOpen(false);
      navigate(`/recipes/${result.data.id}`);
    };

    return (
      <>
        <div className="relative min-w-0 flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => revalidator.revalidate()}
          disabled={revalidator.state === "loading"}
        >
          <RefreshCwIcon
            className={`size-4 ${revalidator.state === "loading" ? "animate-spin" : ""}`}
          />
          <span className="sr-only">Refresh recipes</span>
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Link2Icon data-icon="inline-start" />
          <span className="hidden sm:inline">Import from URL</span>
          <span className="sr-only sm:hidden">Import from URL</span>
        </Button>
        <Button onClick={() => setNewRecipeOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          <span className="hidden sm:inline">New recipe</span>
          <span className="sr-only sm:hidden">New recipe</span>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/settings">
            <UploadIcon data-icon="inline-start" />
            <span className="hidden md:inline">Import recipes</span>
            <span className="sr-only md:hidden">Import recipes</span>
          </Link>
        </Button>

        <Dialog
          open={importOpen}
          onOpenChange={(open) => !isImporting && setImportOpen(open)}
        >
          <DialogContent showCloseButton={!isImporting}>
            <form onSubmit={handleImport}>
              <DialogHeader>
                <DialogTitle>Import recipe from URL</DialogTitle>
                <DialogDescription>
                  Kombu will use AI to extract a recipe from the page.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="recipe-import-url">Recipe URL</Label>
                <Input
                  id="recipe-import-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/recipe"
                  value={importUrl}
                  onChange={(event) => {
                    setImportUrl(event.target.value);
                    setImportError(null);
                  }}
                  disabled={isImporting}
                  aria-invalid={Boolean(importError)}
                  aria-describedby={
                    importError ? "recipe-import-error" : undefined
                  }
                  className="mt-2"
                  autoFocus
                  required
                />
                {importError && (
                  <p
                    id="recipe-import-error"
                    className="mt-2 text-sm text-destructive"
                    role="alert"
                  >
                    {importError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportOpen(false)}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isImporting}>
                  {isImporting && (
                    <Loader2Icon
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  Import recipe
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={newRecipeOpen} onOpenChange={setNewRecipeOpen}>
          <DialogContent>
            <form onSubmit={handleCreateRecipe}>
              <DialogHeader>
                <DialogTitle>New recipe</DialogTitle>
                <DialogDescription>
                  Start with the essentials. You can add more detail from the
                  recipe page later.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div>
                  <Label htmlFor="new-recipe-title">Title</Label>
                  <Input
                    id="new-recipe-title"
                    value={newRecipeTitle}
                    onChange={(event) => setNewRecipeTitle(event.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="new-recipe-image">Image URL</Label>
                  <Input
                    id="new-recipe-image"
                    type="url"
                    placeholder="https://…"
                    value={newRecipeImageUrl}
                    onChange={(event) =>
                      setNewRecipeImageUrl(event.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="new-recipe-ingredients">Ingredients</Label>
                  <Textarea
                    id="new-recipe-ingredients"
                    placeholder="One ingredient per line"
                    value={newRecipeIngredients}
                    onChange={(event) =>
                      setNewRecipeIngredients(event.target.value)
                    }
                  />
                </div>
                {newRecipeError && (
                  <p className="text-destructive text-sm" role="alert">
                    {newRecipeError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewRecipeOpen(false)}
                  disabled={isCreatingRecipe}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingRecipe}>
                  {isCreatingRecipe && (
                    <Loader2Icon
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  )}
                  Create recipe
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};

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

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { preventScrollReset: true });
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
              onClear={clearFilters}
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
                <Link
                  to="/settings"
                  className="underline hover:text-foreground"
                >
                  import a recipe dataset
                </Link>{" "}
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
