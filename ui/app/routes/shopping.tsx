import {
  LightbulbIcon,
  Loader2Icon,
  PlusIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
import { SourceNotice } from "~/components/source-notice";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
import {
  createShoppingItem,
  getAiCapabilities,
  getShoppingItems,
  getShoppingSuggestions,
  type ShoppingSuggestion,
  updateShoppingItem,
} from "~/lib/api/resources";
import type { Route } from "./+types/shopping";

export function meta() {
  return [{ title: "Shopping | Kombu" }];
}

export async function loader() {
  const [shopping, capabilities] = await Promise.all([
    getShoppingItems(),
    getAiCapabilities(),
  ]);
  return { shopping, capabilities };
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
  const { shopping } = loaderData;
  const revalidator = useRevalidator();
  const needed = shopping.data.filter((item) => item.status === "needed");
  const purchased = shopping.data.filter((item) => item.status === "purchased");
  const groups = useMemo(() => groupItems(needed), [needed]);

  async function toggleItem(id: number, checked: boolean) {
    await updateShoppingItem(id, { status: checked ? "purchased" : "needed" });
    revalidator.revalidate();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <SourceNotice results={[shopping]} />
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
        <ListGroups groups={groups} onToggle={toggleItem} />
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
        </section>
      )}
    </div>
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
}: {
  groups: Map<string, Route.ComponentProps["loaderData"]["shopping"]["data"]>;
  onToggle: (id: number, checked: boolean) => void;
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
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
