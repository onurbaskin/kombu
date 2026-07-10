import {
  CalendarPlusIcon,
  ImagePlusIcon,
  LightbulbIcon,
  Loader2Icon,
  PencilIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useMatches, useNavigate, useRevalidator } from "react-router";
import { Badge } from "~/components/ui/badge";
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
  addRecipeToShoppingList,
  deleteRecipe,
  deleteRecipeVersion,
  enhanceRecipe,
  generateRecipeImage,
  type IngredientSuggestion,
  type Recipe,
  type RecipeEnhancement,
  type RecipeShoppingResult,
  type RecipeVersion,
  suggestRecipeFromInventory,
} from "~/lib/api/resources";

type RecipeDetailData = {
  recipe: { data: Recipe };
  enhancement: { data: RecipeEnhancement | null };
  capabilities: {
    data: Array<{ key: string; enabled: boolean }>;
  };
  version?: { data: RecipeVersion | null };
};

function getRecipeDetailData(matches: ReturnType<typeof useMatches>) {
  for (const match of matches) {
    const data = match.data as Partial<RecipeDetailData> | undefined;
    if (data?.recipe?.data?.id) return data as RecipeDetailData;
  }
  return null;
}

export function RecipeDetailTopbar() {
  const data = getRecipeDetailData(useMatches());
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const recipe = data?.recipe.data;
  const selectedVersion = data?.version?.data ?? null;
  const enhancement = data?.enhancement.data;
  const capabilities = data?.capabilities.data ?? [];
  const canEnhance = capabilities.some(
    (item) => item.key === "recipe_enhancement" && item.enabled,
  );
  const canSuggest = capabilities.some(
    (item) => item.key === "inventory_substitutions" && item.enabled,
  );
  const canShop = capabilities.some(
    (item) => item.key === "shopping_suggestions" && item.enabled,
  );
  const canGenerateImage = capabilities.some(
    (item) => item.key === "recipe_image_generation" && item.enabled,
  );
  const [pending, setPending] = useState<
    "enhance" | "suggest" | "shop" | "image" | "delete" | null
  >(null);
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[] | null>(
    null,
  );
  const [shoppingResult, setShoppingResult] =
    useState<RecipeShoppingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");

  if (!recipe) return null;
  const recipeId = recipe.id;

  async function handleEnhance() {
    setPending("enhance");
    setError(null);
    const result = await enhanceRecipe(recipeId, Boolean(enhancement));
    setPending(null);
    if (!result.data || result.error) {
      setError(result.error ?? "The recipe could not be enhanced.");
      return;
    }
    if (result.data.version_id) {
      navigate(`/recipes/${recipeId}?version=${result.data.version_id}`);
    } else {
      revalidator.revalidate();
    }
  }

  async function handleSuggest() {
    setPending("suggest");
    setError(null);
    const result = await suggestRecipeFromInventory(recipeId);
    setPending(null);
    if (!result.data || result.error) {
      setError(result.error ?? "Alternatives could not be generated.");
      return;
    }
    setSuggestions(result.data);
  }

  async function handleShopping() {
    setPending("shop");
    setError(null);
    const result = await addRecipeToShoppingList(recipeId);
    setPending(null);
    if (!result.data || result.error) {
      setError(result.error ?? "The shopping list could not be updated.");
      return;
    }
    setShoppingResult(result.data);
  }

  async function handleGenerateImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("image");
    setError(null);
    const result = await generateRecipeImage(recipeId, imagePrompt);
    setPending(null);
    if (!result.data || result.error) {
      setError(result.error ?? "The recipe image could not be generated.");
      return;
    }
    setImagePrompt("");
    setImageOpen(false);
    revalidator.revalidate();
  }

  async function handleDelete() {
    const label = selectedVersion ? "this recipe version" : "this recipe";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setPending("delete");
    setError(null);
    const result = selectedVersion
      ? await deleteRecipeVersion(recipeId, selectedVersion.id)
      : await deleteRecipe(recipeId);
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(selectedVersion ? `/recipes/${recipeId}` : "/recipes");
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link
          to={
            selectedVersion
              ? `/recipes/${recipeId}/versions/${selectedVersion.id}/edit`
              : `/recipes/${recipeId}/edit`
          }
        >
          <PencilIcon data-icon="inline-start" />
          <span className="hidden lg:inline">Edit</span>
          <span className="sr-only lg:hidden">Edit recipe</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/meal-planner?recipeId=${recipeId}`}>
          <CalendarPlusIcon data-icon="inline-start" />
          <span className="hidden xl:inline">Plan meal</span>
          <span className="sr-only xl:hidden">Add to meal planner</span>
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!canSuggest || pending !== null}
        onClick={() => void handleSuggest()}
        title={
          !canSuggest ? "Enable inventory substitutions in Settings" : undefined
        }
      >
        {pending === "suggest" ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : (
          <LightbulbIcon data-icon="inline-start" />
        )}
        <span className="hidden xl:inline">Suggest from inventory</span>
        <span className="sr-only xl:hidden">Suggest from inventory</span>
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending !== null}
        onClick={() => void handleDelete()}
      >
        {pending === "delete" ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : (
          <Trash2Icon data-icon="inline-start" />
        )}
        <span className="hidden xl:inline">
          {selectedVersion ? "Delete version" : "Delete recipe"}
        </span>
        <span className="sr-only xl:hidden">
          {selectedVersion ? "Delete recipe version" : "Delete recipe"}
        </span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!canGenerateImage || pending !== null}
        onClick={() => setImageOpen(true)}
        title={
          !canGenerateImage
            ? "Enable recipe image generation in Settings"
            : undefined
        }
      >
        <ImagePlusIcon data-icon="inline-start" />
        <span className="hidden xl:inline">Generate image</span>
        <span className="sr-only xl:hidden">Generate recipe image</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={
          !canShop || pending !== null || recipe.ingredients.length === 0
        }
        onClick={() => void handleShopping()}
        title={
          !canShop ? "Enable smart shopping suggestions in Settings" : undefined
        }
      >
        {pending === "shop" ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : (
          <ShoppingCartIcon data-icon="inline-start" />
        )}
        <span className="hidden xl:inline">Add to shopping list</span>
        <span className="sr-only xl:hidden">Add to shopping list</span>
      </Button>
      <Button
        size="sm"
        disabled={!canEnhance || pending !== null}
        onClick={() => void handleEnhance()}
        title={
          !canEnhance ? "Enable recipe enhancement in Settings" : undefined
        }
      >
        {pending === "enhance" ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : enhancement ? (
          <RefreshCwIcon data-icon="inline-start" />
        ) : (
          <WandSparklesIcon data-icon="inline-start" />
        )}
        <span className="hidden lg:inline">
          {enhancement ? "Regenerate" : "Enhance recipe"}
        </span>
        <span className="sr-only lg:hidden">
          {enhancement
            ? "Regenerate enhanced recipe"
            : "Enhance recipe using AI"}
        </span>
      </Button>

      <Dialog
        open={suggestions !== null}
        onOpenChange={() => setSuggestions(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cook with what you have</DialogTitle>
            <DialogDescription>
              Availability and practical alternatives from your current
              inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {suggestions?.map((suggestion) => (
              <div
                key={suggestion.name}
                className="flex flex-col gap-1 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm">{suggestion.name}</span>
                  <Badge
                    variant={suggestion.available ? "secondary" : "outline"}
                  >
                    {suggestion.available ? "In inventory" : "Missing"}
                  </Badge>
                </div>
                {!suggestion.available && (
                  <p className="text-pretty text-muted-foreground text-sm">
                    {suggestion.substitutions.length
                      ? `Try ${suggestion.substitutions.join(", ")}.`
                      : "No suitable substitute is currently in inventory."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shoppingResult !== null}
        onOpenChange={() => setShoppingResult(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shopping list updated</DialogTitle>
            <DialogDescription>
              Kombu added useful purchase quantities and skipped items you
              already have.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <strong>{shoppingResult?.added.length ?? 0}</strong> items added.
            </p>
            {(shoppingResult?.skipped_available.length ?? 0) > 0 && (
              <p className="text-muted-foreground">
                Already covered: {shoppingResult?.skipped_available.join(", ")}.
              </p>
            )}
            {(shoppingResult?.skipped_household_quantity.length ?? 0) > 0 && (
              <p className="text-muted-foreground">
                Tiny pantry quantities skipped:{" "}
                {shoppingResult?.skipped_household_quantity.join(", ")}.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={imageOpen}
        onOpenChange={(open) => !pending && setImageOpen(open)}
      >
        <DialogContent>
          <form onSubmit={(event) => void handleGenerateImage(event)}>
            <DialogHeader>
              <DialogTitle>Generate a recipe image</DialogTitle>
              <DialogDescription>
                Kombu sends the full recipe details to the configured image
                provider and caches the result.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="recipe-image-prompt">
                Custom prompt (optional)
              </Label>
              <Input
                id="recipe-image-prompt"
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="Bright Mediterranean table, rustic ceramic bowl…"
                disabled={pending === "image"}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImageOpen(false)}
                disabled={pending === "image"}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending === "image"}>
                {pending === "image" && (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                {recipe.images?.length ? "Retry image" : "Generate image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={error !== null} onOpenChange={() => setError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recipe action unavailable</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
