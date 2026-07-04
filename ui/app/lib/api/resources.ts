import {
  type ApiResult,
  type ApiSchema,
  createKombuClient,
  withFallback,
} from "~/lib/api/client";

export type AiCapability = ApiSchema<"AiCapabilityRead">;
export type CurrentUser = ApiSchema<"CurrentUserRead">;
export type ExpiryAlert = ApiSchema<"ExpiryAlertRead">;
export type ImportJob = ApiSchema<"ImportJobRead">;
export type ImportSource = ApiSchema<"ImportSourceRead">;
export type InventoryItem = ApiSchema<"InventoryItemRead">;
export type Readiness = ApiSchema<"ReadinessRead">;
export type Recipe = ApiSchema<"RecipeRead">;
export type ScannerCapability = ApiSchema<"ScannerCapabilityRead">;
export type ScanSession = ApiSchema<"ScanSessionRead">;
export type ShoppingItem = ApiSchema<"ShoppingListItemRead">;
export type SystemOverview = ApiSchema<"SystemOverviewRead">;

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

const fallbackRecipes: Recipe[] = [
  {
    id: 1,
    title: "Weeknight lentil bowl",
    summary:
      "A pantry-first template that proves user-cooked recipes come first.",
    source_url: null,
    source_type: "user",
    cuisine: "Everyday",
    yield_servings: 2,
    prep_minutes: 10,
    cook_minutes: 25,
    is_favorite: true,
    created_at: timestamp,
    updated_at: timestamp,
    ingredients: [
      {
        id: 1,
        name: "Lentils",
        quantity: 1,
        unit: "cup",
        note: null,
        position: 0,
      },
      {
        id: 2,
        name: "Greens",
        quantity: 2,
        unit: "handfuls",
        note: "Use what expires first.",
        position: 1,
      },
    ],
  },
  {
    id: 2,
    title: "Scanner-to-shopping soup",
    summary:
      "A placeholder recipe for testing scanner, inventory, and shopping links.",
    source_url: null,
    source_type: "user",
    cuisine: "Batch cooking",
    yield_servings: 4,
    prep_minutes: 15,
    cook_minutes: 35,
    is_favorite: false,
    created_at: timestamp,
    updated_at: timestamp,
    ingredients: [],
  },
];

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

export function getRecipes(): Promise<ApiResult<Recipe[]>> {
  return withFallback(client.GET("/api/v1/recipes"), fallbackRecipes);
}

export function getInventory(): Promise<ApiResult<InventoryItem[]>> {
  return withFallback(client.GET("/api/v1/inventory"), fallbackInventory);
}

export function getShoppingItems(): Promise<ApiResult<ShoppingItem[]>> {
  return withFallback(client.GET("/api/v1/shopping-list"), fallbackShopping);
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

export function getAiCapabilities(): Promise<ApiResult<AiCapability[]>> {
  return withFallback(
    client.GET("/api/v1/ai/capabilities"),
    fallbackAiCapabilities,
  );
}
