import {
  ArrowLeftIcon,
  ClockIcon,
  ExternalLinkIcon,
  ShoppingCartIcon,
  UsersIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Link, useNavigation } from "react-router";
import { SourceNotice } from "~/components/source-notice";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { getRecipe } from "~/lib/api/resources";
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

export async function loader({ params }: Route.LoaderArgs) {
  const recipeId = Number(params.id);
  if (Number.isNaN(recipeId)) {
    throw new Response("Not Found", { status: 404 });
  }
  const recipe = await getRecipe(recipeId);
  return { recipe };
}

export default function RecipeDetail({ loaderData }: Route.ComponentProps) {
  const { recipe: recipeResult } = loaderData;
  const recipe = recipeResult.data;
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

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
        className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to recipes
      </Link>

      <div className="mb-6 overflow-hidden rounded-xl bg-muted aspect-video flex items-center justify-center border">
        <span className="text-muted-foreground text-sm">
          Recipe image placeholder
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <h1 className="font-bold text-2xl md:text-3xl tracking-tight">
          {recipe.is_favorite && (
            <span
              className="text-amber-500 mr-2"
              role="img"
              aria-label="Favorite"
            >
              ★
            </span>
          )}
          {recipe.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{recipe.source_type}</Badge>
          {recipe.cuisine && (
            <Badge variant="secondary">{recipe.cuisine}</Badge>
          )}
        </div>
      </div>

      {recipe.summary && (
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          {recipe.summary}
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        {recipe.prep_minutes != null && recipe.cook_minutes != null && (
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-2 py-2 px-4">
              <ClockIcon className="size-4 text-muted-foreground" />
              <span className="text-sm">
                Prep: {recipe.prep_minutes}m · Cook: {recipe.cook_minutes}m
                <span className="text-muted-foreground ml-1">
                  ({recipe.prep_minutes + recipe.cook_minutes}m total)
                </span>
              </span>
            </CardContent>
          </Card>
        )}
        {recipe.yield_servings != null && (
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-2 py-2 px-4">
              <UsersIcon className="size-4 text-muted-foreground" />
              <span className="text-sm">{recipe.yield_servings} servings</span>
            </CardContent>
          </Card>
        )}
        {recipe.source_url && (
          <Card className="border-dashed">
            <CardContent className="flex items-center gap-2 py-2 px-4">
              <ExternalLinkIcon className="size-4 text-muted-foreground" />
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-primary transition-colors"
              >
                View source
              </a>
            </CardContent>
          </Card>
        )}
      </div>

      {recipe.ingredients.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Ingredients
              {recipe.yield_servings != null && (
                <span className="text-muted-foreground font-normal text-sm">
                  {recipe.yield_servings} servings
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-baseline gap-2 text-sm">
                  {ing.quantity != null && (
                    <span className="font-medium tabular-nums shrink-0">
                      {ing.quantity}
                    </span>
                  )}
                  {ing.unit && (
                    <span className="text-muted-foreground shrink-0">
                      {ing.unit}
                    </span>
                  )}
                  <span>{ing.name}</span>
                  {ing.note && (
                    <span className="text-muted-foreground text-xs">
                      ({ing.note})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recipe.instructions && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-line">
              {recipe.instructions}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled>
          <WandSparklesIcon data-icon="inline-start" />
          Suggest from inventory
        </Button>
        <Button variant="outline" disabled>
          <ShoppingCartIcon data-icon="inline-start" />
          Add to shopping list
        </Button>
      </div>
    </div>
  );
}
