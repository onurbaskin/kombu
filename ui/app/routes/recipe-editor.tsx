import { ArrowLeftIcon, SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { RecipeEditor } from "~/components/recipe-editor";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  createRecipe,
  getRecipe,
  getRecipeVersion,
  type Recipe,
  type RecipeVersion,
  updateRecipe,
  updateRecipeVersion,
} from "~/lib/api/resources";
import {
  type EditorData,
  editorIngredients,
  ingredientEditorData,
  parseEditorData,
  serializeEditorData,
} from "~/lib/editorjs";
import type { Route } from "./+types/recipe-editor";

export async function loader({ params }: Route.LoaderArgs) {
  if (!params.id) return { recipe: null };
  if (params.versionId) {
    return {
      recipe: null,
      version: await getRecipeVersion(
        Number(params.id),
        Number(params.versionId),
      ),
    };
  }
  const recipe = await getRecipe(Number(params.id));
  return { recipe, version: null };
}

export function meta({ data }: Route.MetaArgs) {
  const record = data?.version?.data ?? data?.recipe?.data;
  return [
    {
      title: record ? `Edit ${record.title}` : "New recipe",
    },
  ];
}

export const handle = {
  topbar: function RecipeEditorTopbar() {
    return null;
  },
};

export default function RecipeEditorPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const record = (loaderData.version?.data ?? loaderData.recipe?.data) as
    | Recipe
    | RecipeVersion
    | undefined;
  const isVersionEditing = Boolean(loaderData.version?.data);
  const isEditing = Boolean(record?.id);
  const recipeId =
    record && "recipe_id" in record ? record.recipe_id : record?.id;
  const [title, setTitle] = useState(record?.title ?? "");
  const [summary, setSummary] = useState(record?.summary ?? "");
  const [imageUrl, setImageUrl] = useState(record?.image_url ?? "");
  const [cuisine, setCuisine] = useState(record?.cuisine ?? "");
  const [servings, setServings] = useState(
    record?.yield_servings?.toString() ?? "",
  );
  const [prepMinutes, setPrepMinutes] = useState(
    record?.prep_minutes?.toString() ?? "",
  );
  const [cookMinutes, setCookMinutes] = useState(
    record?.cook_minutes?.toString() ?? "",
  );
  const [ingredients, setIngredients] = useState<EditorData>(() =>
    ingredientEditorData(record?.ingredients ?? []),
  );
  const [instructions, setInstructions] = useState<EditorData>(() =>
    parseEditorData(record?.instructions),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) return;
    setTitle(record.title);
    setSummary(record.summary ?? "");
    setImageUrl(record.image_url ?? "");
    setCuisine(record.cuisine ?? "");
    setServings(record.yield_servings?.toString() ?? "");
    setPrepMinutes(record.prep_minutes?.toString() ?? "");
    setCookMinutes(record.cook_minutes?.toString() ?? "");
    setIngredients(ingredientEditorData(record.ingredients ?? []));
    setInstructions(parseEditorData(record.instructions));
  }, [record]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("A recipe title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      title: title.trim(),
      summary: summary.trim() || null,
      image_url: imageUrl.trim() || null,
      cuisine: cuisine.trim() || null,
      yield_servings: servings ? Number(servings) : null,
      prep_minutes: prepMinutes ? Number(prepMinutes) : null,
      cook_minutes: cookMinutes ? Number(cookMinutes) : null,
      instructions: serializeEditorData(instructions),
      ingredients: editorIngredients(ingredients),
    };
    const result =
      isVersionEditing && recipeId && record
        ? await updateRecipeVersion(recipeId, record.id, body)
        : record && recipeId
          ? await updateRecipe(recipeId, body)
          : await createRecipe({
              ...body,
              source_type: "user",
              is_favorite: false,
            });
    setSaving(false);
    if (result.error || !result.data?.id) {
      setError(result.error ?? "The recipe could not be saved.");
      return;
    }
    navigate(
      isVersionEditing && recipeId && record
        ? `/recipes/${recipeId}?version=${record.id}`
        : `/recipes/${result.data.id}`,
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to={
          isEditing && recipeId
            ? `/recipes/${recipeId}${isVersionEditing && record ? `?version=${record.id}` : ""}`
            : "/recipes"
        }
        className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {isEditing ? "Back to recipe" : "Back to recipes"}
      </Link>
      <div>
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          {isVersionEditing
            ? "Edit recipe version"
            : isEditing
              ? "Edit recipe"
              : "New recipe"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Build the recipe with structured blocks so it stays easy to read and
          update.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Recipe could not be saved</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Recipe details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recipe-title">Title</Label>
              <Input
                id="recipe-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recipe-summary">Summary</Label>
              <Textarea
                id="recipe-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recipe-image-url">Image URL</Label>
              <Input
                id="recipe-image-url"
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-cuisine">Cuisine</Label>
              <Input
                id="recipe-cuisine"
                value={cuisine}
                onChange={(event) => setCuisine(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-servings">Servings</Label>
              <Input
                id="recipe-servings"
                type="number"
                min={1}
                value={servings}
                onChange={(event) => setServings(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-prep">Prep minutes</Label>
              <Input
                id="recipe-prep"
                type="number"
                min={0}
                value={prepMinutes}
                onChange={(event) => setPrepMinutes(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-cook">Cook minutes</Label>
              <Input
                id="recipe-cook"
                type="number"
                min={0}
                value={cookMinutes}
                onChange={(event) => setCookMinutes(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <RecipeEditor
              data={ingredients}
              onChange={setIngredients}
              placeholder="Add one ingredient per list item…"
            />
            <p className="mt-2 text-muted-foreground text-xs">
              Use the plus button, choose List, and add one ingredient per item.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecipeEditor
              data={instructions}
              onChange={setInstructions}
              placeholder="Write the cooking steps…"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link
              to={
                isEditing && recipeId
                  ? `/recipes/${recipeId}${isVersionEditing && record ? `?version=${record.id}` : ""}`
                  : "/recipes"
              }
            >
              Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : "Save recipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
