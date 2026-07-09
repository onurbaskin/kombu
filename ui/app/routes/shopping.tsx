import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useRevalidator } from "react-router";
import { PageHeader } from "~/components/page-header";
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
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  createShoppingItem,
  getShoppingItems,
  updateShoppingItem,
} from "~/lib/api/resources";
import type { Route } from "./+types/shopping";

export function meta() {
  return [{ title: "Shopping | Kombu" }];
}
export async function loader() {
  return { shopping: await getShoppingItems() };
}

const listPeriods = ["Current", "Weekly", "Monthly"] as const;

export default function Shopping({ loaderData }: Route.ComponentProps) {
  const { shopping } = loaderData;
  const revalidator = useRevalidator();
  const [period, setPeriod] = useState<(typeof listPeriods)[number]>("Current");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("Other");
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const needed = shopping.data.filter((item) => item.status === "needed");
    return needed.reduce((grouped, item) => {
      const key = item.category?.trim() || "Other";
      const items = grouped.get(key) ?? [];
      items.push(item);
      grouped.set(key, items);
      return grouped;
    }, new Map<string, typeof needed>());
  }, [shopping.data]);

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createShoppingItem({
      name,
      quantity: Number(quantity) || 1,
      unit: unit || null,
      category: category || "Other",
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setName("");
    setQuantity("1");
    setUnit("");
    setCategory("Other");
    revalidator.revalidate();
  }

  async function toggleItem(id: number, checked: boolean) {
    await updateShoppingItem(id, { status: checked ? "purchased" : "needed" });
    revalidator.revalidate();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          eyebrow="Shopping"
          title="Your list"
          description="Organised in the order you shop."
        />
        <Button
          size="sm"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add item
        </Button>
      </div>
      <SourceNotice results={[shopping]} />
      <Tabs
        value={period}
        onValueChange={(value) => setPeriod(value as typeof period)}
      >
        <TabsList>
          {listPeriods.map((value) => (
            <TabsTrigger key={value} value={value}>
              {value}
            </TabsTrigger>
          ))}
        </TabsList>
        {listPeriods.map((value) => (
          <TabsContent key={value} value={value} className="mt-5">
            <ListGroups
              groups={value === "Current" ? groups : new Map()}
              onToggle={toggleItem}
              period={value}
            />
          </TabsContent>
        ))}
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={addItem}>
            <DialogHeader>
              <DialogTitle>Add shopping item</DialogTitle>
              <DialogDescription>
                Choose a category so the list follows your route through the
                shop.
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
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListGroups({
  groups,
  onToggle,
  period,
}: {
  groups: Map<string, Route.ComponentProps["loaderData"]["shopping"]["data"]>;
  onToggle: (id: number, checked: boolean) => void;
  period: string;
}) {
  if (groups.size === 0)
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
        {period === "Current"
          ? "Nothing to buy. Add the first item for this trip."
          : `${period} lists are ready for planning—add items to the current list when you need them.`}
      </div>
    );
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
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${index > 0 ? "border-t" : ""}`}
                >
                  <Checkbox
                    aria-label={`Mark ${item.name} as purchased`}
                    checked={false}
                    onCheckedChange={(checked) =>
                      onToggle(item.id, checked === true)
                    }
                  />
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-sm">
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
