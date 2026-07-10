import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("recipes/new", "routes/recipe-editor.tsx", { id: "recipe-new" }),
  route("recipes/:id/versions/:versionId/edit", "routes/recipe-editor.tsx", {
    id: "recipe-version-edit",
  }),
  route("recipes/:id/edit", "routes/recipe-editor.tsx", { id: "recipe-edit" }),
  route("recipes", "routes/recipes.tsx"),
  route("recipes/:id", "routes/recipe-detail.tsx"),
  route("inventory", "routes/inventory.tsx"),
  route("shopping", "routes/shopping.tsx"),
  route("meal-planner", "routes/meal-planner.tsx"),
  route("scanner", "routes/scanner.tsx"),
  route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
