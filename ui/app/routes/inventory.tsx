import { BellIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { StatusBadge } from "~/components/status-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  createInventoryItem,
  getExpiryAlerts,
  getInventory,
} from "~/lib/api/resources";
import type { Route } from "./+types/inventory";

export function meta() {
  return [{ title: "Inventory | Kombu" }];
}

export async function loader() {
  const [inventory, alerts] = await Promise.all([
    getInventory(),
    getExpiryAlerts(),
  ]);
  return { inventory, alerts };
}

type Location = "pantry" | "fridge" | "freezer" | "counter" | "other";

const locations: Location[] = [
  "pantry",
  "fridge",
  "freezer",
  "counter",
  "other",
];

export default function Inventory({ loaderData }: Route.ComponentProps) {
  const { inventory, alerts } = loaderData;
  const revalidator = useRevalidator();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [location, setLocation] = useState<Location>("pantry");
  const [expiresOn, setExpiresOn] = useState("");

  function openAdd(item?: (typeof inventory.data)[number]) {
    setName(item?.name ?? "");
    setQuantity(String(item?.quantity ?? 1));
    setUnit(item?.unit ?? "");
    setLocation((item?.location as Location | undefined) ?? "pantry");
    setExpiresOn("");
    setError(null);
    setOpen(true);
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const result = await createInventoryItem({
      name,
      quantity: Number(quantity) || 1,
      unit: unit || null,
      location,
      expires_on: expiresOn || null,
      source: "manual",
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    revalidator.revalidate();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          eyebrow="Kitchen stock"
          title="Inventory"
          description="Add, replenish, and use what you already have."
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <BellIcon data-icon="inline-start" />
            Expiry
          </Button>
          <Button size="sm" onClick={() => openAdd()}>
            <PlusIcon data-icon="inline-start" />
            Add item
          </Button>
        </div>
      </div>

      <SourceNotice results={[inventory, alerts]} />

      {alerts.data.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <span className="font-medium text-sm">Use soon</span>
          {alerts.data.map((alert) => (
            <Button
              key={alert.item_id}
              variant="ghost"
              size="sm"
              onClick={() =>
                openAdd(
                  inventory.data.find((item) => item.id === alert.item_id),
                )
              }
            >
              {alert.name} <StatusBadge value={alert.severity} />
            </Button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  {item.notes && (
                    <div className="text-muted-foreground text-xs">
                      {item.notes}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.location}</Badge>
                </TableCell>
                <TableCell>
                  {item.expires_on ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openAdd(item)}
                  >
                    <RotateCcwIcon />
                    <span className="sr-only">Re-add {item.name}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={saveItem}>
            <DialogHeader>
              <DialogTitle>Add to inventory</DialogTitle>
              <DialogDescription>
                Use this for a new item or to replenish something you already
                have.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="inventory-name">Item</FieldLabel>
                <Input
                  id="inventory-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoFocus
                  aria-invalid={Boolean(error)}
                />
                <FieldDescription>{error}</FieldDescription>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="inventory-quantity">Quantity</FieldLabel>
                  <Input
                    id="inventory-quantity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="inventory-unit">Unit</FieldLabel>
                  <Input
                    id="inventory-unit"
                    placeholder="bag, kg, tins"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Storage</FieldLabel>
                  <Select
                    value={location}
                    onValueChange={(value) => setLocation(value as Location)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {locations.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="inventory-expiry">Expiry</FieldLabel>
                  <Input
                    id="inventory-expiry"
                    type="date"
                    value={expiresOn}
                    onChange={(event) => setExpiresOn(event.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
