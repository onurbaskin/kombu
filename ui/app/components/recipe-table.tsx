import { ClockIcon } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Recipe } from "~/lib/api/resources";

export function RecipeTable({ recipes }: { recipes: Recipe[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipe</TableHead>
          <TableHead>Cuisine</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="text-right">Serves</TableHead>
          <TableHead className="text-right">Ingredients</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipes.map((recipe) => (
          <TableRow key={recipe.id}>
            <TableCell>
              <Link
                to={`/recipes/${recipe.id}`}
                className="hover:text-primary transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {recipe.is_favorite && (
                      <span className="text-amber-500 mr-1">★</span>
                    )}
                    {recipe.title}
                  </span>
                  {recipe.summary && (
                    <span className="text-muted-foreground text-xs line-clamp-1">
                      {recipe.summary}
                    </span>
                  )}
                </div>
              </Link>
            </TableCell>
            <TableCell>
              {recipe.cuisine ? (
                <Badge variant="secondary">{recipe.cuisine}</Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={recipe.source_type === "user" ? "default" : "outline"}
              >
                {recipe.source_type}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                {recipe.prep_minutes != null && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="size-3" />
                    {recipe.prep_minutes + (recipe.cook_minutes ?? 0)}m
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {recipe.yield_servings ?? "—"}
            </TableCell>
            <TableCell className="text-right">
              {recipe.ingredients.length}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
