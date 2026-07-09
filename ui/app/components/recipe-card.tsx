import { ClockIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import type { Recipe } from "~/lib/api/resources";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link to={`/recipes/${recipe.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {recipe.title}
            </h3>
            {recipe.is_favorite && (
              <span className="text-amber-500 shrink-0">
                <span className="sr-only">Favorite</span>★
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recipe.summary && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {recipe.summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{recipe.source_type}</Badge>
            {recipe.cuisine && (
              <Badge variant="secondary">{recipe.cuisine}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            {recipe.cook_minutes != null && (
              <span className="flex items-center gap-1">
                <ClockIcon className="size-3" />
                {recipe.cook_minutes}m
              </span>
            )}
            {recipe.yield_servings != null && (
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3" />
                {recipe.yield_servings}
              </span>
            )}
            <span className="ml-auto">
              {recipe.ingredients.length} ingredients
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
