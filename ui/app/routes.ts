import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("recipes", "routes/recipes.tsx"),
  route("inventory", "routes/inventory.tsx"),
  route("shopping", "routes/shopping.tsx"),
  route("scanner", "routes/scanner.tsx"),
  route("imports", "routes/imports.tsx"),
  route("ai", "routes/ai.tsx"),
  route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
