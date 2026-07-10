import {
  CalendarRangeIcon,
  LightbulbIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  ShoppingBagIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
import { SourceNotice } from "~/components/source-notice";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  createShoppingItem,
  deleteShoppingItem,
  getAiCapabilities,
  getPlannedShopping,
  getShoppingItems,
  getShoppingSuggestions,
  type PlannedShoppingItem,
  type ShoppingItem,
  type ShoppingSuggestion,
  updateShoppingItem,
} from "~/lib/api/resources";
import type { Route } from "./+types/shopping";

export function meta() {
  return [{ title: "Shopping | Kombu" }];
}

function dateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export async function loader() {
  const today = new Date();
  const todayKey = dateKey(today);
  const [shopping, capabilities, weeklyPlanned, monthlyPlanned] =
    await Promise.all([
      getShoppingItems(),
      getAiCapabilities(),
      getPlannedShopping(todayKey, dateKey(addDays(today, 6))),
      getPlannedShopping(todayKey, dateKey(addDays(today, 29))),
    ]);
  return { shopping, capabilities, weeklyPlanned, monthlyPlanned };
}

export const handle = { topbar: ShoppingTopbar };

function ShoppingTopbar() {
  const data = useRouteLoaderData<typeof loader>("routes/shopping");
  const revalidator = useRevalidator();
  const [addOpen, setAddOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ShoppingSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const aiEnabled = data?.capabilities.data.some(
    (capability) =>
      capability.key === "shopping_suggestions" && capability.enabled,
  );

  async function loadSuggestions() {
    setSuggestionsOpen(true);
    setSuggesting(true);
    setSuggestionError(null);
    const result = await getShoppingSuggestions();
    setSuggesting(false);
    setSuggestions(result.data.suggestions);
    setSuggestionError(result.error ?? null);
  }

  async function addSuggestion(suggestion: ShoppingSuggestion) {
    const result = await createShoppingItem({
      name: suggestion.item_name,
      quantity: 1,
      category: suggestion.category,
    });
    if (result.error) {
      setSuggestionError(result.error);
      return;
    }
    setSuggestions((current) => current.filter((item) => item !== suggestion));
    revalidator.revalidate();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!aiEnabled}
        title={
          aiEnabled
            ? undefined
            : "Enable smart shopping suggestions in Settings"
        }
        onClick={() => void loadSuggestions()}
      >
        <LightbulbIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Suggest items</span>
      </Button>
      <Button size="sm" onClick={() => setAddOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Add item</span>
      </Button>
      <ShoppingItemDialog open={addOpen} onOpenChange={setAddOpen} />
      <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggestions for your next run</DialogTitle>
            <DialogDescription>
              Based on what is left, expiring stock, planned recipes, and
              previous shopping runs.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto py-2">
            {suggesting && (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
                <Loader2Icon className="animate-spin" /> Analysing your kitchen…
              </div>
            )}
            {suggestionError && (
              <p className="text-destructive text-sm">{suggestionError}</p>
            )}
            {!suggesting && !suggestionError && suggestions.length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Nothing useful to suggest yet.
              </p>
            )}
            {suggestions.map((suggestion) => (
              <div
                key={`${suggestion.category}-${suggestion.item_name}`}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">
                      {suggestion.item_name}
                    </p>
                    <Badge variant="secondary">{suggestion.category}</Badge>
                  </div>
                  <p className="mt-1 text-pretty text-muted-foreground text-sm">
                    {suggestion.reason}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void addSuggestion(suggestion)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Shopping({ loaderData }: Route.ComponentProps) {
  const { shopping, weeklyPlanned, monthlyPlanned } = loaderData;
  const revalidator = useRevalidator();
  const [error, setError] = useState<string | null>(null);
  const needed = shopping.data.filter((item) => item.status === "needed");
  const purchased = shopping.data.filter((item) => item.status === "purchased");
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const groups = useMemo(() => groupItems(needed), [needed]);

  async function toggleItem(id: number, checked: boolean) {
    const result = await updateShoppingItem(id, {
      status: checked ? "purchased" : "needed",
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    revalidator.revalidate();
  }

  async function deleteItem(id: number) {
    const result = await deleteShoppingItem(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    revalidator.revalidate();
  }

  async function addPlannedItem(item: PlannedShoppingItem) {
    const result = await createShoppingItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: "Planned meals",
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    revalidator.revalidate();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <SourceNotice results={[shopping, weeklyPlanned, monthlyPlanned]} />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Shopping list update failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Tabs defaultValue="upcoming" className="gap-5">
        <TabsList aria-label="Shopping horizon">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="flex flex-col gap-6">
          {groups.size === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Your list is clear</EmptyTitle>
                <EmptyDescription>
                  Add an item from the top bar when you need it.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ListGroups
              groups={groups}
              onToggle={toggleItem}
              onEdit={setEditingItem}
              onDelete={(item) => void deleteItem(item.id)}
            />
          )}
          {purchased.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBagIcon aria-hidden="true" />
                <h2 className="font-medium text-sm">Recently purchased</h2>
                <Badge variant="secondary">{purchased.length}</Badge>
              </div>
              <div className="overflow-hidden rounded-lg border">
                {purchased.slice(0, 12).map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${index ? "border-t" : ""}`}
                  >
                    <Checkbox
                      checked
                      onCheckedChange={(checked) =>
                        void toggleItem(item.id, checked === true)
                      }
                      aria-label={`Move ${item.name} back to the list`}
                    />
                    <span className="flex-1 text-muted-foreground text-sm line-through">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">
                Marking an item purchased also receives it into pantry
                inventory.
              </p>
            </section>
          )}
        </TabsContent>
        <TabsContent value="weekly">
          <PlannedShoppingView
            items={weeklyPlanned.data}
            title="Next seven days"
            onAdd={(item) => void addPlannedItem(item)}
          />
        </TabsContent>
        <TabsContent value="monthly">
          <PlannedShoppingView
            items={monthlyPlanned.data}
            title="Next thirty days"
            onAdd={(item) => void addPlannedItem(item)}
          />
        </TabsContent>
      </Tabs>
      <ShoppingItemEditDialog
        key={editingItem?.id ?? "none"}
        item={editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      />
    </div>
  );
}

function PlannedShoppingView({
  items,
  title,
  onAdd,
}: {
  items: PlannedShoppingItem[];
  title: string;
  onAdd: (item: PlannedShoppingItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRangeIcon aria-hidden="true" />
          Planned meals
        </CardTitle>
        <CardDescription>
          {title}. Add ingredients to the active shopping list when you are
          ready.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Schedule a meal to see its ingredient demand here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {items.map((item, index) => (
              <div
                key={`${item.name}-${item.unit ?? "each"}`}
                className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center ${index ? "border-t" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {item.already_needed && (
                      <Badge variant="secondary">Already on list</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {item.quantity} {item.unit ?? ""} ·{" "}
                    {item.recipe_titles.join(", ")} · first needed{" "}
                    {item.first_needed_on}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={item.already_needed ? "ghost" : "outline"}
                  disabled={item.already_needed}
                  onClick={() => onAdd(item)}
                >
                  {item.already_needed ? "On list" : "Add to list"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShoppingItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const revalidator = useRevalidator();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("Other");
  const [error, setError] = useState<string | null>(null);

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createShoppingItem({
      name,
      quantity: Number(quantity) || 1,
      unit: unit || null,
      category: category || "Other",
    });
    if (result.error) return setError(result.error);
    onOpenChange(false);
    setName("");
    setQuantity("1");
    setUnit("");
    setCategory("Other");
    revalidator.revalidate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={addItem}>
          <DialogHeader>
            <DialogTitle>Add shopping item</DialogTitle>
            <DialogDescription>
              Group it by the aisle or category you use while shopping.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="shopping-name">Item</FieldLabel>
              <Input
                id="shopping-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                required
                autoFocus
                aria-invalid={Boolean(error)}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="shopping-quantity">Quantity</FieldLabel>
                <Input
                  id="shopping-quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shopping-unit">Unit</FieldLabel>
                <Input
                  id="shopping-unit"
                  placeholder="bag, kg"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="shopping-category">Category</FieldLabel>
              <Input
                id="shopping-category"
                placeholder="Produce, proteins, household"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function groupItems(
  items: Route.ComponentProps["loaderData"]["shopping"]["data"],
) {
  return items.reduce((grouped, item) => {
    const key = item.category?.trim() || "Other";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
    return grouped;
  }, new Map<string, typeof items>());
}

function ListGroups({
  groups,
  onToggle,
  onEdit,
  onDelete,
}: {
  groups: Map<string, Route.ComponentProps["loaderData"]["shopping"]["data"]>;
  onToggle: (id: number, checked: boolean) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, items]) => (
          <section key={category}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-medium text-sm">{category}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="overflow-hidden rounded-lg border">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${index ? "border-t" : ""}`}
                >
                  <Checkbox
                    aria-label={`Mark ${item.name} as purchased`}
                    checked={false}
                    onCheckedChange={(checked) =>
                      onToggle(item.id, checked === true)
                    }
                  />
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {item.quantity} {item.unit}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    aria-label={`Edit ${item.name}`}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item)}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function ShoppingItemEditDialog({
  item,
  onOpenChange,
}: {
  item: ShoppingItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const revalidator = useRevalidator();
  const [quantity, setQuantity] = useState(item?.quantity.toString() ?? "1");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [category, setCategory] = useState(item?.category ?? "Other");
  const [error, setError] = useState<string | null>(null);

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    const result = await updateShoppingItem(item.id, {
      quantity: Number(quantity) || 1,
      unit: unit || null,
      category: category || "Other",
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    revalidator.revalidate();
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void saveItem(event)}>
          <DialogHeader>
            <DialogTitle>Edit {item?.name}</DialogTitle>
            <DialogDescription>
              Update quantity, unit, or aisle category.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-shopping-quantity">Quantity</FieldLabel>
              <Input
                id="edit-shopping-quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-shopping-unit">Unit</FieldLabel>
              <Input
                id="edit-shopping-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </Field>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="edit-shopping-category">Category</FieldLabel>
              <Input
                id="edit-shopping-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
