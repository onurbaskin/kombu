import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("recipes", "routes/recipes.tsx"),
  route("recipes/:id", "routes/recipe-detail.tsx"),
  route("inventory", "routes/inventory.tsx"),
  route("shopping", "routes/shopping.tsx"),
  route("scanner", "routes/scanner.tsx"),
  route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
