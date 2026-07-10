# Kombu API/UI Coverage Checklist

Audit date: 2026-07-10
Scope: `api/`, `ui/app/`, `openapi.json`, live API, and live React Router UI.

## Executive result

The backend exposes 61 live HTTP operations across 45 paths. The generated
OpenAPI contract is synchronized with the running API. The main product flows
now have direct UI consumers; the remaining API-only operations are deliberate
health/admin/scaffold contracts rather than clickable product controls.

The remaining deliberate gaps are:

1. Receipt OCR and dedicated scanner hardware are no longer advertised as live
   scanner capabilities until their workflows have a real UI and worker.
2. Provider-free AI scaffolds and duplicate AI contracts remain API-only; the
   product UI uses the stored recipe-assistance and shopping-suggestion routes.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| Covered | API operation and UI data/action are connected and source-aligned. |
| Partial | Some of the API capability or UI surface is connected, but a portion is missing or limited. |
| API-only | The API operation exists, but no live UI consumer was found. |
| Placeholder | UI renders a surface without connecting it to the available API data. |
| Contract drift | Generated/check-in contract differs from the running API. |
| External | The UI action uses a non-Kombu service rather than a Kombu endpoint. |

## Endpoint-to-UI matrix

Source locations below are the implementation sources, not generated schema
files. `resources.ts` is listed when the UI calls through the shared client.

### Health, system, and users

| Method and endpoint | API source | UI source / consumer | Status | Notes |
| --- | --- | --- | --- | --- |
| `GET /healthz` | `api/app/routes/health/endpoints.py:8` | None | API-only | Liveness endpoint; no product UI should need to render it. |
| `GET /api/v1/system/overview` | `api/app/routes/system/endpoints.py:24` | `ui/app/lib/api/resources.ts:309`; home/scanner/settings loaders | Covered | Dashboard metrics, feature access, and quick links now consume the endpoint. |
| `GET /api/v1/system/readiness` | `api/app/routes/system/endpoints.py:33` | `ui/app/lib/api/resources.ts:317`; home loader | Covered | Dashboard includes readiness in its source notice. |
| `GET /api/v1/system/features` | `api/app/routes/system/endpoints.py:39` | None | API-only | Settings reads features embedded in overview instead. |
| `PATCH /api/v1/system/features/{key}` | `api/app/routes/system/endpoints.py:45` | `ui/app/routes/settings.tsx:230`; `resources.ts:709` | Covered | Settings switches persist the feature flag and revalidate. |
| `GET /api/v1/users/me` | `api/app/routes/users/endpoints.py:23` | `ui/app/routes/settings.tsx:119`; `resources.ts:313` | Covered | Drives admin visibility and permission-aware settings UI. |
| `GET /api/v1/users` | `api/app/routes/users/endpoints.py:29` | `ui/app/routes/settings.tsx:126`; `resources.ts:751` | Covered | Admin user-management list. |
| `PATCH /api/v1/users/{user_id}` | `api/app/routes/users/endpoints.py:35` | `ui/app/routes/settings.tsx:387`; `resources.ts:788` | Covered | Role and active-state controls are wired. |
| `GET /api/v1/users/invites` | `api/app/routes/users/endpoints.py:53` | `ui/app/routes/settings.tsx:127`; `resources.ts:761` | Covered | Pending invitations are displayed. |
| `POST /api/v1/users/invites` | `api/app/routes/users/endpoints.py:65` | `ui/app/routes/settings.tsx:220`; `resources.ts:771` | Covered | Invite dialog sends the selected role. |
| `DELETE /api/v1/users/invites/{invite_id}` | `api/app/routes/users/endpoints.py:85` | `ui/app/routes/settings.tsx`; `resources.ts` | Covered | Pending invites expose a revoke action with error handling. |

### Blob delivery

| Method and endpoint | API source | UI source / consumer | Status | Notes |
| --- | --- | --- | --- | --- |
| `GET /blobs/{blob_key}` | `api/app/routes/blobs/endpoints.py` | None | API-only | Generic application-owned asset delivery; no current UI surface uses the route directly. |

### Recipes

| Method and endpoint | API source | UI source / consumer | Status | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/recipes` | `api/app/routes/recipes/endpoints.py:145` | `ui/app/routes/recipes.tsx:405`; `resources.ts:439` | Covered | Search, filters, sorting, pagination, grid/table views. |
| `POST /api/v1/recipes` | `api/app/routes/recipes/endpoints.py:196` | `ui/app/routes/recipe-editor.tsx`; `resources.ts:548` | Covered | Dedicated Editor.js recipe page creates the recipe. |
| `PATCH /api/v1/recipes/{recipe_id}` | `api/app/routes/recipes/endpoints.py` | `ui/app/routes/recipe-editor.tsx`; `resources.ts` | Covered | Editor.js edit page updates metadata, instructions, and ingredient blocks. |
| `DELETE /api/v1/recipes/{recipe_id}` | `api/app/routes/recipes/endpoints.py` | `ui/app/components/recipe-detail-topbar.tsx`; `resources.ts` | Covered | Detail action confirms and removes the complete recipe and child versions/images. |
| `GET /api/v1/recipes/{recipe_id}/versions` | `api/app/routes/recipes/endpoints.py` | `ui/app/routes/recipe-detail.tsx`; `resources.ts` | Covered | Detail view lists original and generated versions. |
| `GET /api/v1/recipes/{recipe_id}/versions/{version_id}` | `api/app/routes/recipes/endpoints.py` | `ui/app/routes/recipe-editor.tsx`; `resources.ts` | Covered | Version-aware editor loader reads a complete snapshot. |
| `PATCH /api/v1/recipes/{recipe_id}/versions/{version_id}` | `api/app/routes/recipes/endpoints.py` | `ui/app/routes/recipe-editor.tsx`; `resources.ts` | Covered | Generated versions can be manually edited without changing the original. |
| `DELETE /api/v1/recipes/{recipe_id}/versions/{version_id}` | `api/app/routes/recipes/endpoints.py` | `ui/app/components/recipe-detail-topbar.tsx`; `resources.ts` | Covered | Selected generated versions can be removed from the detail view. |
| `GET /api/v1/recipes/filters` | `api/app/routes/recipes/endpoints.py:203` | `ui/app/routes/recipes.tsx:434`; `resources.ts:463` | Covered | Filter controls are populated from the API. |
| `GET /api/v1/recipes/{recipe_id}` | `api/app/routes/recipes/endpoints.py:209` | `ui/app/routes/recipe-detail.tsx:36`; `resources.ts:539` | Covered | Recipe cards/table rows link to the detail loader. |
| `GET /api/v1/recipes/{recipe_id}/enhancement` | `api/app/routes/recipes/endpoints.py:220` | `ui/app/routes/recipe-detail.tsx:38`; `resources.ts:503` | Covered | Cached enhancement is loaded with the recipe. |
| `POST /api/v1/recipes/{recipe_id}/enhancement` | `api/app/routes/recipes/endpoints.py:239` | `ui/app/components/recipe-detail-topbar.tsx`; `resources.ts:511` | Covered | UI action is capability-gated, cached, and live-tested through the DeepSeek JSON fallback. |
| `POST /api/v1/recipes/{recipe_id}/inventory-suggestions` | `api/app/routes/recipes/endpoints.py:293` | `ui/app/components/recipe-detail-topbar.tsx`; `resources.ts:521` | Covered | UI action is capability-gated and live-tested with a provider-backed result dialog. |
| `POST /api/v1/recipes/{recipe_id}/shopping-list` | `api/app/routes/recipes/endpoints.py:335` | `ui/app/components/recipe-detail-topbar.tsx`; `resources.ts:530` | Covered | Detail action adds missing ingredients and displays the result dialog. |
| `POST /api/v1/recipes/{recipe_id}/images` | `api/app/routes/recipes/endpoints.py` | `ui/app/components/recipe-detail-topbar.tsx`; `resources.ts` | Covered | Custom prompt, retry, OpenRouter generation, persistence, and detail display are wired. |
| `POST /api/v1/recipes/import-url` | `api/app/routes/recipes/endpoints.py:359` | `ui/app/routes/recipes.tsx:110`; `resources.ts:839` | Partial | URL import dialog is wired; AI-off guard correctly prevented the live invalid-URL probe before fetch. |

Recipe update and delete are now available. Favorite state is part of the
recipe PATCH contract; the current editor does not yet expose a favorite switch.

### Inventory, alerts, shopping, and scanner

| Method and endpoint | API source | UI source / consumer | Status | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/inventory` | `api/app/routes/inventory/endpoints.py:29` | `ui/app/routes/inventory.tsx:57`; `resources.ts:338` | Covered | Inventory table and location filter data. |
| `POST /api/v1/inventory` | `api/app/routes/inventory/endpoints.py:41` | `ui/app/routes/inventory.tsx:208,413`; scanner `:189`; `resources.ts:342` | Covered | Manual add, replenish/re-add, and barcode product add all use the endpoint. |
| `POST /api/v1/inventory/import-photos` | `api/app/routes/inventory/endpoints.py:52` | `ui/app/routes/inventory.tsx:91`; `resources.ts:615` | Partial | UI upload, gating, JSON retry, and controlled 503 feedback are wired; the configured DeepSeek model currently returns non-JSON for this image, so no inventory rows are inserted. |
| `GET /api/v1/alerts/expiry` | `api/app/routes/alerts/endpoints.py:13` | `ui/app/routes/inventory.tsx:57`; `resources.ts:388` | Covered | Expiry banner buttons open the corresponding inventory item form. |
| `GET /api/v1/shopping-list` | `api/app/routes/shopping_list/endpoints.py:27` | `ui/app/routes/shopping.tsx:43`; `resources.ts:357` | Covered | Needed and purchased groups are populated from the API. |
| `POST /api/v1/shopping-list` | `api/app/routes/shopping_list/endpoints.py:39` | `ui/app/routes/shopping.tsx:76,242`; `resources.ts:361` | Covered | Manual items and accepted AI suggestions create items. |
| `PATCH /api/v1/shopping-list/{item_id}` | `api/app/routes/shopping_list/endpoints.py:52` | `ui/app/routes/shopping.tsx:173`; `resources.ts:375` | Covered | Checkbox changes status; edit dialog changes quantity, unit, and category. |
| `DELETE /api/v1/shopping-list/{item_id}` | `api/app/routes/shopping_list/endpoints.py` | `ui/app/routes/shopping.tsx`; `resources.ts` | Covered | Each needed item exposes edit and delete controls. |
| `POST /api/v1/shopping-list/suggestions` | `api/app/routes/shopping_list/endpoints.py:68` | `ui/app/routes/shopping.tsx:66`; `resources.ts:595` | Partial | UI-facing suggestions action is wired; provider-backed test returned 200. |
| `GET /api/v1/shopping-list/planned` | `api/app/routes/shopping_list/endpoints.py` | `ui/app/routes/shopping.tsx`; `resources.ts` | Covered | Weekly and monthly tabs aggregate ingredients from scheduled meal occurrences and expose add-to-list actions. |
| `GET /api/v1/scanner/capabilities` | `api/app/routes/scanner/endpoints.py:26` | `ui/app/routes/scanner.tsx:31`; `resources.ts:408` | Covered | Only the implemented camera and barcode capabilities are advertised. |
| `GET /api/v1/scanner/sessions` | `api/app/routes/scanner/endpoints.py:32` | `ui/app/routes/scanner.tsx:34`; `resources.ts:417` | Covered | Recent scan history is displayed. |
| `POST /api/v1/scanner/sessions` | `api/app/routes/scanner/endpoints.py:41` | `ui/app/routes/scanner.tsx:131`; `resources.ts:421` | Covered | Barcode capture persists a scan session. |

The shopping API supports editing quantity, unit, and category; the UI exposes
those fields in the edit dialog and syncs purchased transitions into pantry
inventory. The scanner API currently stores a session placeholder; OCR, receipt parsing,
and dedicated-scanner completion workflows are not implemented.

### Meal planner

| Method and endpoint | API source | UI source / consumer | Status | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/meal-plans` | `api/app/routes/meal_plans/endpoints.py` | `ui/app/routes/meal-planner.tsx`; `resources.ts` | Covered | Calendar loader reads occurrences for day, week, and month windows. |
| `POST /api/v1/meal-plans` | `api/app/routes/meal_plans/endpoints.py` | `ui/app/routes/meal-planner.tsx`; recipe detail topbar; `resources.ts` | Covered | Slot selection and “Plan meal” both use the same recipe search and recurrence dialog. |
| `DELETE /api/v1/meal-plans/{series_id}` | `api/app/routes/meal_plans/endpoints.py` | `ui/app/routes/meal-planner.tsx`; `resources.ts` | Covered | Event dialog removes an entire recurring series. |
| `DELETE /api/v1/meal-plans/occurrences/{occurrence_id}` | `api/app/routes/meal_plans/endpoints.py` | `ui/app/routes/meal-planner.tsx`; `resources.ts` | Covered | Event dialog removes only the selected occurrence. |

Meal-plan recurrence is materialized into concrete occurrences so calendar,
shopping, and occurrence deletion share one persisted representation. Planned
shopping is aggregated by ingredient and unit across those occurrences, and
the UI can copy a demand line into the active list.

### Imports and AI

| Method and endpoint | API source | UI source / consumer | Status | Notes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/imports/sources` | `api/app/routes/imports/endpoints.py:45` | `ui/app/routes/settings.tsx:121`; `resources.ts:397` | Covered | Settings displays source readiness and descriptions. JSON/CSV are correctly marked unavailable by the API. |
| `GET /api/v1/imports/sources/{source_key}/credential` | `api/app/routes/imports/endpoints.py:51` | None | API-only | Settings saves credentials but never reads credential status directly. |
| `PUT /api/v1/imports/sources/{source_key}/credential` | `api/app/routes/imports/endpoints.py:70` | `ui/app/routes/settings.tsx:246`; `resources.ts:809` | Covered | Credential dialog is wired and the secret is encrypted server-side. |
| `GET /api/v1/imports/jobs` | `api/app/routes/imports/endpoints.py:102` | `ui/app/routes/settings.tsx:122`; `resources.ts:404` | Covered | Recent job status is displayed. |
| `POST /api/v1/imports/jobs` | `api/app/routes/imports/endpoints.py:108` | `ui/app/routes/settings.tsx:459`; `resources.ts:557` | Covered | Ready Kaggle dataset source invokes the dataset job endpoint. JSON/CSV buttons are not shown because the API marks them unavailable. |
| `GET /api/v1/ai/capabilities` | `api/app/routes/ai/endpoints.py:75` | recipes, inventory, shopping, recipe detail, settings loaders | Covered | Capability switches gate UI actions and are persisted through settings. |
| `PATCH /api/v1/ai/capabilities/{key}` | `api/app/routes/ai/endpoints.py:81` | `ui/app/routes/settings.tsx:238`; `resources.ts:730` | Covered | Settings switches update and revalidate. |
| `POST /api/v1/ai/suggestions` | `api/app/routes/ai/endpoints.py:93` | None | API-only | Provider-free persisted suggestion scaffold; no UI action uses it. |
| `POST /api/v1/ai/shopping/suggest` | `api/app/routes/ai/endpoints.py:107` | `resources.ts:567` only; helper is unused | API-only | UI uses `/api/v1/shopping-list/suggestions` instead. Two shopping-suggestion contracts exist. |
| `POST /api/v1/ai/recipes/enhance` | `api/app/routes/ai/endpoints.py:130` | None | API-only | No client helper or UI action; recipe detail uses the stored-recipe endpoint instead. |
| `POST /api/v1/ai/recipes/substitutions` | `api/app/routes/ai/endpoints.py:158` | None | API-only | No client helper or UI action; recipe detail uses the stored-recipe endpoint instead. |
| `GET /api/v1/ai/providers/known` | `api/app/routes/ai/endpoints.py:181` | `ui/app/routes/settings.tsx:124`; `resources.ts:639` | Covered | Provider selector is populated from the API. |
| `GET /api/v1/ai/providers` | `api/app/routes/ai/endpoints.py:189` | `ui/app/routes/settings.tsx:125`; `resources.ts:649` | Covered | Provider list and enabled state are displayed. |
| `POST /api/v1/ai/providers` | `api/app/routes/ai/endpoints.py:196` | `ui/app/routes/settings.tsx:207`; `resources.ts:659` | Covered | Add-provider dialog creates encrypted provider configuration. |
| `PATCH /api/v1/ai/providers/{provider_id}` | `api/app/routes/ai/endpoints.py:223` | `ui/app/routes/settings.tsx:200,283`; `resources.ts:684` | Covered | Edit and enable/disable controls are wired. |
| `DELETE /api/v1/ai/providers/{provider_id}` | `api/app/routes/ai/endpoints.py:256` | `ui/app/routes/settings.tsx`; `resources.ts` | Covered | Delete result is checked and surfaced before revalidation. |

## Contract drift

The checked-in generated contract reports 45 paths and 61 operations. Runtime
OpenAPI reports the same 45 paths and 61 operations. There is no current
contract drift:

| Checked-in contract | Runtime result | Source evidence |
| --- | --- | --- |
| No differences | All generated paths are registered | `scripts/export_openapi.py`, `pnpm --dir ui generate:api`, and live `/openapi.json` comparison |

The implemented vision path is
`POST /api/v1/inventory/import-photos`, defined at
`api/app/routes/inventory/endpoints.py:52` and called by the inventory UI.

## UI surface checklist

| UI surface | Source | API/data connection | Status |
| --- | --- | --- | --- |
| Dashboard | `ui/app/routes/home.tsx:1-156` | `GET /system/overview`, `GET /system/readiness`, internal links | Covered |
| Main navigation and mobile drawer | `ui/app/root.tsx:44-50,117-224` | Client-side routes only | Covered; the API overview advertises only implemented UI routes. |
| Recipe search/filter/pagination/view toggle | `ui/app/routes/recipes.tsx:405-657`; `ui/app/components/recipe-filters.tsx:50-210` | `GET /recipes`, `GET /recipes/filters` | Covered |
| New/edit/version recipe | `ui/app/routes/recipe-editor.tsx`; `ui/app/routes.ts` | `POST/PATCH /recipes`, version CRUD, Editor.js output | Covered; dedicated Editor.js editor and read-only detail renderer. |
| Import recipe from URL | `ui/app/routes/recipes.tsx:110-140,229-318` | `POST /recipes/import-url` | Partial; AI/provider availability is correctly enforced; live page extraction remains provider/content dependent. |
| Recipe cards/table/detail | `ui/app/components/recipe-card.tsx:13-75`; `recipe-table.tsx:14-85`; `recipe-detail.tsx` | `GET /recipes`, recipe/version reads, enhancement GET | Covered; one dynamic paper surface grows with image, ingredients, and instructions. |
| Recipe AI topbar | `ui/app/components/recipe-detail-topbar.tsx` | Enhancement/version creation, substitutions, shopping list, image generation, version/recipe delete | Covered; AI rewrite creates a navigable full-recipe snapshot. |
| Inventory table/manual add/re-add | `ui/app/routes/inventory.tsx:198-395` | `GET /inventory`, `POST /inventory`, `GET /alerts/expiry` | Covered |
| Inventory photo upload | `ui/app/routes/inventory.tsx:91-180` | `POST /inventory/import-photos` | Partial; endpoint has provider fallback/validation and UI error feedback, but the current DeepSeek model is not returning structured vision JSON for the public test image. |
| Shopping list/add/toggle/purchased history | `ui/app/routes/shopping.tsx:166-225,228-384` | `GET/POST /shopping-list`, `PATCH /shopping-list/{id}` | Covered |
| Shopping horizon tabs | `ui/app/routes/shopping.tsx` | `GET /shopping-list/planned`, `POST /shopping-list`, purchase-to-inventory transition | Covered; Upcoming, Weekly, and Monthly views are connected to the planner and inventory. |
| Meal planner | `ui/app/routes/meal-planner.tsx` | `GET/POST/DELETE /meal-plans`, recipe search, recurrence API | Covered; day view supports 15/30/60-minute slots, week and month views, series/occurrence removal. |
| Shopping suggestions | `ui/app/routes/shopping.tsx:66-161` | `POST /shopping-list/suggestions` | Covered; live DeepSeek run returned suggestions |
| Scanner camera/barcode | `ui/app/routes/scanner.tsx:106-205,207-330` | `GET /scanner/capabilities`, `GET/POST /scanner/sessions`, `POST /inventory` | Covered for camera/barcode |
| Scanner product lookup | `ui/app/routes/scanner.tsx:156-187` | Open Food Facts external API | External; not backed by a Kombu endpoint |
| Scanner receipt/dedicated hardware capabilities | Removed from `api/app/routes/scanner/utils.py` | None | Deliberately not advertised until implemented |
| AI provider management | `ui/app/routes/settings.tsx:175-218,269-321,489-583` | Provider known/list/create/update/delete | Covered, with delete error-handling weakness |
| Feature and AI capability switches | `ui/app/routes/settings.tsx:230-244,324-370` | Feature/capability PATCH endpoints | Covered |
| User management/invite | `ui/app/routes/settings.tsx:373-429,585-634` | Users GET/PATCH and invite GET/POST/DELETE | Covered; invite revoke is available and browser-tested. |
| Recipe source credentials/import jobs | `ui/app/routes/settings.tsx:431-487,636-678` | Sources, credential PUT, jobs GET/POST | Covered for currently available Kaggle dataset flow; JSON/CSV upload/mapping is intentionally unavailable |
| Fallback/starter data notice | `ui/app/components/source-notice.tsx:10-25`; `resources.ts:99-304` | Fallbacks for most resource reads | Partial; useful for offline layout testing, with source notice now also present on the dashboard |
| Presentational components | `ui/app/components/status-badge.tsx`, `metric-card.tsx`, `page-header.tsx` | No endpoint responsibility | `MetricCard` and `PageHeader` are not used by current route surfaces; no API gap by themselves |
| shadcn UI primitives | `ui/app/components/ui/` (45 files) | No endpoint responsibility | Presentational/control primitives; feature mapping belongs to their consuming route, not the primitives |

## Dummy, dead, or incomplete implementation inventory

| Finding | Evidence | Impact |
| --- | --- | --- |
| Dashboard placeholder | Fixed in `ui/app/routes/home.tsx:1-156` | Overview metrics, feature access, readiness, and working quick links now render from API data. |
| Unused API helpers | `getReadiness`, `getRecipes`, and `suggestShoppingItems` in `ui/app/lib/api/resources.ts` have no route/component callers | These are not UI features despite having client-side code. |
| Duplicate shopping AI contracts | `resources.ts:567-593` calls `/ai/shopping/suggest`, while `:595-613` calls `/shopping-list/suggestions` and only the latter is used | API behavior can diverge and the unused helper can conceal a dead contract. |
| Fallback data is intentionally substantial | `resources.ts:99-304` contains fallback overview, user, inventory, shopping, alerts, imports, scanner, AI, and readiness data | A disconnected UI can appear populated; each page must be checked for `SourceNotice`. |
| Recipe delete UI is intentionally absent | API has create/update/delete and favorite is part of PATCH; editor UI creates/updates and detail reads cached images | Destructive deletion remains API-only by design; favorite editing can be added to the editor without another contract. |
| Import capability description overclaims | `api/app/routes/system/utils.py:51-56` mentions CSV/JSON/web imports; `api/app/routes/imports/utils.py:27-45` says JSON/CSV upload/mapping is unavailable | Feature overview and import-source detail do not describe the same maturity level. |
| Provider compatibility is negotiated by retry | `api/app/services/ai.py` retries structured calls with explicit JSON prompting when a provider rejects `response_format` | DeepSeek recipe enhancement now succeeds and validates provider variations such as list-valued instructions. |
| Editor.js is client-only | `ui/app/components/recipe-editor.tsx` dynamically imports core/tools and destroys instances on unmount | SSR remains safe; read-only detail rendering uses the same block contract. |

## Live verification record

### Runtime and UI

- Started the API with `make api-dev` in a separate Ghostty terminal using a
  migrated temporary SQLite database at `/tmp/kombu-audit.db`.
- Started the UI with `make ui-dev` in a separate Ghostty terminal.
- `GET /healthz` returned 200.
- All live read endpoints in the matrix returned 200 on the temporary database.
- Invalid query probes returned expected 422 responses for
  `max_total_minutes=0` and `days=999`.
- `GET /api/v1/shopping-list/suggestions` returned expected 405 because the
  contract is POST-only.
- Successful isolated write probes: recipe create, inventory create, shopping
  create/status update, scanner session create, generic AI suggestion, user
  invite/revocation, feature toggle, AI capability toggle, import credential,
  provider CRUD, and provider deletion.
- Rendered UI smoke checks returned 200 for `/`, `/recipes`, `/inventory`,
  `/shopping`, `/scanner`, `/settings`, and `/recipes/2`.

### DeepSeek test (initial compatibility probe)

- Temporary provider configuration used provider `deepseek` and model
  `deepseek-v4-pro`, which the API normalized to `deepseek/deepseek-v4-pro`.
- `POST /api/v1/ai/shopping/suggest`: 200 with six suggestions.
- `POST /api/v1/shopping-list/suggestions`: 200 with five suggestions.
- The initial probe exposed that DeepSeek rejects structured `response_format`.
  This is retained as the reason for the fallback implementation below; those
  errors are no longer the current behavior.
- The supplied credential was never written to a repository file or audit
  report. The temporary provider and temporary database were removed after the
  run.

### OpenRouter/Gemini image test

- OpenRouter model page: [`google/gemini-3.1-flash-image`](https://openrouter.ai/google/gemini-3.1-flash-image).
- Temporary provider configuration used provider `openrouter`, base URL
  `https://openrouter.ai/api/v1`, and model
  `openrouter/google/gemini-3.1-flash-image`.
- `POST /api/v1/inventory/import-photos` with the public food-packaging JPEG
  returned 201 and created 12 inventory items.
- The temporary OpenRouter provider was deleted with 204 immediately after the
  probe; the key was not written to the repository or report.

### Persisted test providers

After the isolated probes, both requested providers were created in the actual
Kombu database through the admin API. Their encrypted credentials are now
available for continued testing; no credential material is recorded here.

| Provider | Label | Stored model | Enabled | API response |
| --- | --- | --- | --- | --- |
| DeepSeek | DeepSeek v4 Pro | `deepseek/deepseek-v4-pro` | Yes | 201 Created |
| OpenRouter | OpenRouter Gemini 3.1 Flash Image | `openrouter/google/gemini-3.1-flash-image` | Yes | 201 Created |

The downloaded test images were temporary only: [Food packages (1).jpg](https://commons.wikimedia.org/wiki/File:Food_packages_%281%29.jpg)
and [Italian supermarket receipt showing VAT categories](https://commons.wikimedia.org/wiki/File%3AItalian_supermarket_receipt_showing_value-added-tax_%28IVA%29_categories.jpg).

### Quality gates

- Backend: `make api-check` passed; 33 tests passed.
- Frontend: `pnpm --dir ui typecheck` passed.
- Frontend: `pnpm --dir ui build` passed; Vite emitted only sourcemap warnings
  for generated shadcn files.
- Frontend lint: passed after organizing the scanner imports.
- Frontend build: passed with only existing sourcemap warnings for generated
  shadcn files.

### Implementation pass verification

- Live recipe CRUD: create, PATCH metadata/ingredients, GET with cached images,
  and DELETE all returned the expected statuses.
- Live OpenRouter image generation: the configured Gemini image model returned
  base64 image data; two generated images persisted in `recipe_images`, and the
  recipe GET returned them. The UI supports a custom prompt and retry label.
- Live DeepSeek recipe enhancement: structured-output rejection triggered the
  JSON retry and returned a validated enhancement; provider list-valued
  instructions were normalized to readable text.
- Live image-analysis probe: the public Wikimedia food image reached the real
  upload endpoint and the provider fallback returned a controlled 503 because
  DeepSeek responded with prose instead of the required JSON. The UI displays
  this error; a vision-capable text model should be configured for inventory
  photo extraction. The OpenRouter Gemini image model is used successfully for
  recipe image generation, where its image output is appropriate.
- Browser recipe flow: `/recipes/new` initialized two Editor.js instances;
  saving created a recipe; the detail page rendered read-only Editor.js blocks;
  `/recipes/:id/edit` PATCHed the recipe successfully.
- Browser detail actions: Suggest from inventory, Add to shopping list,
  Regenerate enhancement, and Generate image dialog all completed without page
  or console errors.
- Browser shopping/settings maintenance: quantity/category edit, item delete,
  and invite revoke were all exercised against the live API.
- API contract checks: runtime and generated OpenAPI both report 45 paths and
  61 operations; the stale `/api/v1/ai/inventory/analyze-photos` path is absent.
- Live meal-planner integration: a weekly series materialized three
  occurrences, and `/shopping-list/planned` aggregated its ingredients across
  all three dates.
- Live purchase integration: transitioning a shopping item to purchased
  created one pantry inventory row; repeating the same PATCH did not increment
  it again.

## UI repair pass

The browser audit found and fixed a client-side route-loader crash. The browser
bundle evaluated `process.env.KOMBU_API_BASE_URL`, but `process` does not exist in
the browser. Every sidebar click therefore reloaded back to `/` after React
Router failed to load the target route. `ui/app/lib/api/client.ts:21-28` now
uses Vite's browser-safe `import.meta.env` path in the browser and keeps
`process.env` for server-side rendering.

The homepage was also replaced with a live overview in
`ui/app/routes/home.tsx`: metric cards, API feature access, readiness/fallback
notice, and links to working UI routes are now present. Invalid API navigation
entries such as `/imports` and `/ai` are filtered from the dashboard quick-link
list until those UI routes exist.

Browser verification after the fixes:

- All six desktop sidebar links navigated to the expected route with no console
  errors.
- The mobile drawer opened and navigated to Recipes correctly.
- Recipe creation navigated to the new detail page; table view changed the URL
  to `?view=table`.
- Inventory creation added a visible row.
- Shopping creation and status toggle moved an item into purchased history.
- Settings invite creation displayed the new pending invite.
- Settings provider creation and deletion worked on the isolated audit API.
- Import credential save changed the source to ready.
- Mobile scanner start reached the camera permission error UI without a page
  crash.
- The full consolidated browser action run produced no page or console errors.

Action failure feedback was also added for shopping updates, scanner-session
creation, provider deletion, provider enable/disable, user role/active
changes, and import-job creation. These actions now display the API error in
the relevant page instead of silently revalidating.

## Recommended implementation order — completed

1. Removed `/imports` and `/ai` from API-generated navigation because those UI
   routes do not exist.
2. Removed the stale generated vision contract by exporting runtime OpenAPI and
   regenerating `ui/app/lib/api/schema.d.ts`.
3. Added structured-output fallback and validation for text and vision calls.
4. Removed unimplemented receipt/dedicated scanner capabilities from the live
   capability response.
5. Added recipe PATCH/DELETE, cached recipe image generation, shopping edit/
   delete, invite revoke, and checked error feedback for write actions.
6. Kept the canonical UI shopping flow on `POST /shopping-list/suggestions`;
   the older generic AI helper remains explicitly API-only for compatibility.

The remaining roadmap items are intentionally scoped: favorite editing, receipt
OCR, dedicated hardware workers, and the provider-free AI scaffold need product
decisions or additional infrastructure before exposing them as UI actions.
