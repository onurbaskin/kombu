import {
  LightbulbIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShoppingCartIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { useMatches, useRevalidator } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  addRecipeToShoppingList,
  enhanceRecipe,
  type IngredientSuggestion,
  type Recipe,
  type RecipeEnhancement,
  type RecipeShoppingResult,
  suggestRecipeFromInventory,
} from "~/lib/api/resources";

type RecipeDetailData = {
  recipe: { data: Recipe };
  enhancement: { data: RecipeEnhancement | null };
  capabilities: {
    data: Array<{ key: string; enabled: boolean }>;
  };
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
  const recipe = data?.recipe.data;
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
  const [pending, setPending] = useState<"enhance" | "suggest" | "shop" | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[] | null>(
    null,
  );
  const [shoppingResult, setShoppingResult] =
    useState<RecipeShoppingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    revalidator.revalidate();
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

  return (
    <>
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
