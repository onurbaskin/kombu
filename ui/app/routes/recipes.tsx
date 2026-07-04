import { PlusIcon, WandSparklesIcon } from "lucide-react";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { getRecipes } from "~/lib/api/resources";
import type { Route } from "./+types/recipes";

export function meta() {
  return [{ title: "Recipes | Kombu" }];
}

export async function loader() {
  const recipes = await getRecipes();
  return { recipes };
}

export default function Recipes({ loaderData }: Route.ComponentProps) {
  const { recipes } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cookbook"
        title="Recipes should start with what users actually cook."
        description="Capture house recipes first, then import datasets and web recipes when a cook asks for more options."
        actions={
          <>
            <Button variant="outline">
              <WandSparklesIcon data-icon="inline-start" />
              Suggest from inventory
            </Button>
            <Button>
              <PlusIcon data-icon="inline-start" />
              New recipe
            </Button>
          </>
        }
      />

      <SourceNotice results={[recipes]} />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Capture recipe</CardTitle>
            <CardDescription>
              A first-pass layout for manual capture, scanner handoff, or import
              review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="recipe-title">Title</FieldLabel>
                <Input
                  id="recipe-title"
                  placeholder="Weeknight soup"
                  readOnly
                />
                <FieldDescription>
                  Mutations will connect to the FastAPI recipe endpoints next.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="recipe-summary">Notes</FieldLabel>
                <Textarea
                  id="recipe-summary"
                  placeholder="What makes this recipe yours?"
                  readOnly
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recipe database</CardTitle>
            <CardDescription>
              User recipes, imported recipes, web recipes, and future AI drafts
              share one API contract.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recipes.data.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PlusIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No recipes yet</EmptyTitle>
                  <EmptyDescription>
                    Capture the first cooked recipe or queue an import source.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button>Capture first recipe</Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Serves</TableHead>
                    <TableHead>Ingredients</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.data.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{recipe.title}</span>
                          <span className="text-muted-foreground text-sm">
                            {recipe.summary ?? "No summary yet"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={recipe.is_favorite ? "default" : "outline"}
                        >
                          {recipe.source_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{recipe.yield_servings ?? "Unset"}</TableCell>
                      <TableCell>{recipe.ingredients.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
