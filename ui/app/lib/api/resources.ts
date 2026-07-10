import {
  type ApiResult,
  type ApiSchema,
  createKombuClient,
  getApiBaseUrl,
  withFallback,
} from "~/lib/api/client";

export type AiProviderConfig = {
  id: number;
  provider: string;
  label: string;
  api_key_configured: boolean;
  api_key_hint: string | null;
  base_url: string | null;
  default_model: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AiProviderConfigUpdate = {
  label?: string;
  api_key?: string;
  base_url?: string | null;
  default_model?: string;
  is_enabled?: boolean;
};

export type KnownProvider = {
  key: string;
  label: string;
  docs: string;
};

export type AiCapability = ApiSchema<"AiCapabilityRead">;
export type CurrentUser = ApiSchema<"CurrentUserRead">;
export type ExpiryAlert = ApiSchema<"ExpiryAlertRead">;
export type ImportJob = ApiSchema<"ImportJobRead">;
export type ImportSource = ApiSchema<"ImportSourceRead">;
export type InventoryItem = ApiSchema<"InventoryItemRead">;
export type Readiness = ApiSchema<"ReadinessRead">;
export type Recipe = ApiSchema<"RecipeRead">;
export type RecipeCreate = ApiSchema<"RecipeCreate">;
export type RecipeFilterValues = ApiSchema<"RecipeFilterValues">;
export type RecipeListResponse = ApiSchema<"RecipeListResponse">;
export type ScannerCapability = ApiSchema<"ScannerCapabilityRead">;
export type ScanSession = ApiSchema<"ScanSessionRead">;
export type ShoppingItem = ApiSchema<"ShoppingListItemRead">;
export type SystemOverview = ApiSchema<"SystemOverviewRead">;

export type ShoppingSuggestion = {
  item_name: string;
  reason: string;
  priority: string;
};

const client = createKombuClient();

const fallbackOverview: SystemOverview = {
  app_name: "Kombu",
  environment: "development",
  metrics: [
    {
      key: "recipes",
      label: "Recipes",
      value: 0,
      description: "Cookbook entries ready to search and cook.",
    },
    {
      key: "inventory",
      label: "Inventory",
      value: 0,
      description: "Tracked pantry, fridge, freezer, and counter items.",
    },
    {
      key: "shopping",
      label: "Shopping list",
      value: 0,
      description: "Items waiting to be bought or replenished.",
    },
    {
      key: "imports",
      label: "Import jobs",
      value: 0,
      description: "Dataset and recipe source import requests.",
    },
  ],
  features: [
    {
      key: "scanner",
      label: "Scanner workflows",
      enabled: true,
      description: "Capture labels, barcodes, and receipts.",
    },
    {
      key: "imports",
      label: "Recipe imports",
      enabled: true,
      description: "Prepare datasets and user files for import.",
    },
    {
      key: "ai",
      label: "AI assistance",
      enabled: false,
      description: "Provider-neutral AI hooks are ready for later.",
    },
    {
      key: "sso",
      label: "SSO ready",
      enabled: false,
      description: "The data model leaves room for SSO providers.",
    },
  ],
  navigation: [],
};

const fallbackUser: CurrentUser = {
  id: "local-admin",
  email: "admin@example.invalid",
  display_name: "Local Administrator",
  role: "owner",
  auth_provider: "local",
  permissions: [
    "recipes:write",
    "inventory:write",
    "shopping:write",
    "imports:write",
    "scanner:write",
    "settings:read",
  ],
};

const timestamp = "2026-07-04T09:00:00Z";

const fallbackInventory: InventoryItem[] = [
  {
    id: 1,
    name: "Spinach",
    quantity: 1,
    unit: "bag",
    location: "fridge",
    expires_on: "2026-07-06",
    opened_on: null,
    source: "manual",
    notes: "Prioritize in recipe suggestions.",
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 2,
    name: "Tinned tomatoes",
    quantity: 6,
    unit: "cans",
    location: "pantry",
    expires_on: null,
    opened_on: null,
    source: "manual",
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
];

const fallbackShopping: ShoppingItem[] = [
  {
    id: 1,
    name: "Oats",
    quantity: 1,
    unit: "bag",
    category: "Pantry",
    status: "needed",
    linked_inventory_item_id: null,
    recipe_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 2,
    name: "Lemons",
    quantity: 4,
    unit: null,
    category: "Produce",
    status: "purchased",
    linked_inventory_item_id: null,
    recipe_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
];

const fallbackAlerts: ExpiryAlert[] = [
  {
    item_id: 1,
    name: "Spinach",
    location: "fridge",
    expires_on: "2026-07-06",
    days_until_expiry: 2,
    severity: "urgent",
  },
];

const fallbackImportSources: ImportSource[] = [
  {
    key: "open-recipe-json",
    label: "Open recipe JSON",
    source_type: "json",
    description: "Generic recipe bundles with a documented mapping step.",
    ready_for_import: true,
  },
  {
    key: "kaggle-recipes",
    label: "Kaggle recipe datasets",
    source_type: "dataset",
    description: "User-provided exports prepared as repeatable jobs.",
    ready_for_import: false,
  },
  {
    key: "csv-inventory",
    label: "Inventory CSV",
    source_type: "csv",
    description: "Pantry, fridge, freezer, and shopping imports.",
    ready_for_import: true,
  },
];

const fallbackScannerCapabilities: ScannerCapability[] = [
  {
    key: "camera",
    label: "Camera capture",
    description:
      "Capture receipts, labels, and pantry photos from the browser.",
    requires_hardware: false,
  },
  {
    key: "barcode",
    label: "Barcode scanning",
    description: "Use a camera or dedicated scanner as the capture device.",
    requires_hardware: false,
  },
  {
    key: "dedicated-scanner",
    label: "Dedicated scanner",
    description: "Leave room for USB, Bluetooth, or network scanner workers.",
    requires_hardware: true,
  },
];

const fallbackAiCapabilities: AiCapability[] = [
  {
    key: "recipe-planning",
    label: "Recipe planning",
    enabled: false,
    description: "Plan meals from recipes, inventory, and diet notes.",
  },
  {
    key: "inventory-insights",
    label: "Inventory insights",
    enabled: false,
    description: "Suggest what to cook before food expires.",
  },
];

const fallbackReadiness: Readiness = {
  status: "degraded",
  database: "unknown",
};

export function getSystemOverview(): Promise<ApiResult<SystemOverview>> {
  return withFallback(client.GET("/api/v1/system/overview"), fallbackOverview);
}

export function getCurrentUser(): Promise<ApiResult<CurrentUser>> {
  return withFallback(client.GET("/api/v1/users/me"), fallbackUser);
}

export function getReadiness(): Promise<ApiResult<Readiness>> {
  return withFallback(
    client.GET("/api/v1/system/readiness"),
    fallbackReadiness,
  );
}

export async function getRecipes(): Promise<ApiResult<Recipe[]>> {
  const response = await withFallback(client.GET("/api/v1/recipes"), {
    items: [],
    total: 0,
    page: 1,
    per_page: 50,
  } as RecipeListResponse);
  return {
    data: response.data.items,
    source: response.source,
    error: response.error,
  };
}

export function getInventory(): Promise<ApiResult<InventoryItem[]>> {
  return withFallback(client.GET("/api/v1/inventory"), fallbackInventory);
}

export function createInventoryItem(body: {
  name: string;
  quantity: number;
  unit?: string | null;
  location: "pantry" | "fridge" | "freezer" | "counter" | "other";
  expires_on?: string | null;
  source?: string | null;
  notes?: string | null;
}): Promise<ApiResult<InventoryItem>> {
  return withFallback(
    client.POST("/api/v1/inventory", { body }),
    {} as InventoryItem,
  );
}

export function getShoppingItems(): Promise<ApiResult<ShoppingItem[]>> {
  return withFallback(client.GET("/api/v1/shopping-list"), fallbackShopping);
}

export function createShoppingItem(body: {
  name: string;
  quantity: number;
  unit?: string | null;
  category?: string | null;
}): Promise<ApiResult<ShoppingItem>> {
  return withFallback(
    client.POST("/api/v1/shopping-list", {
      body: { ...body, status: "needed" },
    }),
    {} as ShoppingItem,
  );
}

export function updateShoppingItem(
  id: number,
  body: { status?: "needed" | "purchased" },
): Promise<ApiResult<ShoppingItem>> {
  return withFallback(
    client.PATCH("/api/v1/shopping-list/{item_id}", {
      params: { path: { item_id: id } },
      body,
    }),
    {} as ShoppingItem,
  );
}

export function getExpiryAlerts(): Promise<ApiResult<ExpiryAlert[]>> {
  return withFallback(
    client.GET("/api/v1/alerts/expiry", {
      params: { query: { days: 14 } },
    }),
    fallbackAlerts,
  );
}

export function getImportSources(): Promise<ApiResult<ImportSource[]>> {
  return withFallback(
    client.GET("/api/v1/imports/sources"),
    fallbackImportSources,
  );
}

export function getImportJobs(): Promise<ApiResult<ImportJob[]>> {
  return withFallback(client.GET("/api/v1/imports/jobs"), []);
}

export function getScannerCapabilities(): Promise<
  ApiResult<ScannerCapability[]>
> {
  return withFallback(
    client.GET("/api/v1/scanner/capabilities"),
    fallbackScannerCapabilities,
  );
}

export function getScanSessions(): Promise<ApiResult<ScanSession[]>> {
  return withFallback(client.GET("/api/v1/scanner/sessions"), []);
}

export function createScanSession(body: {
  scan_type: string;
  device_hint?: string | null;
  raw_payload?: string | null;
}): Promise<ApiResult<ScanSession>> {
  return withFallback(
    client.POST("/api/v1/scanner/sessions", { body }),
    {} as ScanSession,
  );
}

export function getAiCapabilities(): Promise<ApiResult<AiCapability[]>> {
  return withFallback(
    client.GET("/api/v1/ai/capabilities"),
    fallbackAiCapabilities,
  );
}

export function getRecipesPaginated(params?: {
  skip?: number;
  limit?: number;
  search?: string;
  cuisine?: string;
  source_type?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<ApiResult<RecipeListResponse>> {
  return withFallback(
    client.GET("/api/v1/recipes", { params: { query: params } }),
    {
      items: [],
      total: 0,
      page: 1,
      per_page: 50,
    } as RecipeListResponse,
  );
}

export function getRecipeFilters(): Promise<ApiResult<RecipeFilterValues>> {
  return withFallback(client.GET("/api/v1/recipes/filters"), {
    cuisines: [],
    source_types: ["user", "import", "web", "ai"],
    max_prep_minutes: null,
    max_cook_minutes: null,
  } as RecipeFilterValues);
}

export function getRecipe(id: number): Promise<ApiResult<Recipe>> {
  return withFallback(
    client.GET("/api/v1/recipes/{recipe_id}", {
      params: { path: { recipe_id: id } },
    }),
    {} as unknown as Recipe,
  );
}

export function createRecipe(body: RecipeCreate): Promise<ApiResult<Recipe>> {
  return withFallback(
    client.POST("/api/v1/recipes", {
      body,
    }),
    {} as unknown as Recipe,
  );
}

export function createImportJob(body: {
  source_name: string;
  source_type: string;
}): Promise<ApiResult<ImportJob>> {
  return withFallback(
    client.POST("/api/v1/imports/jobs", { body }),
    {} as unknown as ImportJob,
  );
}

export async function suggestShoppingItems(body: {
  shopping_history: Record<string, string>[];
  inventory_items: Record<string, string>[];
  planned_recipes: Record<string, string>[];
  frequently_cooked: string[];
}): Promise<ApiResult<{ suggestions: ShoppingSuggestion[] }>> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/v1/ai/shopping/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    const data = await res.json();
    return { data, source: "api" };
  } catch (e) {
    return {
      data: { suggestions: [] },
      source: "fallback",
      error: String(e),
    };
  }
}

export async function getShoppingSuggestions(): Promise<
  ApiResult<{ suggestions: ShoppingSuggestion[] }>
> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/shopping-list/suggestions`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json(), source: "api" };
  } catch (error) {
    return {
      data: { suggestions: [] },
      source: "fallback",
      error:
        error instanceof Error ? error.message : "Unable to suggest items.",
    };
  }
}

export async function importInventoryPhotos(
  photos: File[],
): Promise<ApiResult<{ items: InventoryItem[] }>> {
  const form = new FormData();
  for (const photo of photos) form.append("photos", photo);
  try {
    const res = await fetch(`${baseUrl}/api/v1/inventory/import-photos`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json(), source: "api" };
  } catch (error) {
    return {
      data: { items: [] },
      source: "fallback",
      error:
        error instanceof Error ? error.message : "Unable to analyze photos.",
    };
  }
}

const baseUrl = getApiBaseUrl();

export async function getKnownProviders(): Promise<ApiResult<KnownProvider[]>> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ai/providers/known`);
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json(), source: "api" };
  } catch (e) {
    return { data: [], source: "fallback", error: String(e) };
  }
}

export async function getAiProviders(): Promise<ApiResult<AiProviderConfig[]>> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ai/providers`);
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json(), source: "api" };
  } catch (e) {
    return { data: [], source: "fallback", error: String(e) };
  }
}

export async function createAiProvider(body: {
  provider: string;
  label: string;
  api_key: string;
  base_url?: string | null;
  default_model: string;
  is_enabled?: boolean;
}): Promise<ApiResult<AiProviderConfig>> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ai/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json(), source: "api" };
  } catch (e) {
    return {
      data: {} as AiProviderConfig,
      source: "fallback",
      error: String(e),
    };
  }
}

export async function updateAiProvider(
  id: number,
  body: AiProviderConfigUpdate,
): Promise<ApiResult<AiProviderConfig>> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ai/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return { data: await res.json(), source: "api" };
  } catch (e) {
    return {
      data: {} as AiProviderConfig,
      source: "fallback",
      error: String(e),
    };
  }
}

export async function deleteAiProvider(id: number): Promise<void> {
  await fetch(`${baseUrl}/api/v1/ai/providers/${id}`, { method: "DELETE" });
}

export async function importRecipeFromUrl(
  url: string,
): Promise<ApiResult<Recipe | null>> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/recipes/import-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const payload: unknown = await res.json().catch(() => null);
      const error =
        typeof payload === "object" &&
        payload !== null &&
        "detail" in payload &&
        typeof payload.detail === "string"
          ? payload.detail
          : res.statusText || "Unable to import the recipe.";
      return { data: null, source: "fallback", error };
    }
    const data = await res.json();
    return { data, source: "api" };
  } catch (e) {
    return {
      data: null,
      source: "fallback",
      error: e instanceof Error ? e.message : "Unable to import the recipe.",
    };
  }
}
