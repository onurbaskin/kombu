import {
  ImagePlusIcon,
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
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
  getAiCapabilities,
  getExpiryAlerts,
  getInventory,
  importInventoryPhotos,
} from "~/lib/api/resources";
import type { Route } from "./+types/inventory";

export function meta() {
  return [{ title: "Inventory | Kombu" }];
}

export async function loader() {
  const [inventory, alerts, capabilities] = await Promise.all([
    getInventory(),
    getExpiryAlerts(),
    getAiCapabilities(),
  ]);
  return { inventory, alerts, capabilities };
}

export const handle = { topbar: InventoryTopbar };

type Location = "pantry" | "fridge" | "freezer" | "counter" | "other";

const locations: Location[] = [
  "pantry",
  "fridge",
  "freezer",
  "counter",
  "other",
];

function InventoryTopbar() {
  const data = useRouteLoaderData<typeof loader>("routes/inventory");
  const revalidator = useRevalidator();
  const [addOpen, setAddOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoAnalysisEnabled = data?.capabilities.data.some(
    (capability) =>
      capability.key === "inventory_photo_analysis" && capability.enabled,
  );

  async function analyzePhotos(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photos.length) return;
    setAnalyzing(true);
    setError(null);
    const result = await importInventoryPhotos(photos);
    setAnalyzing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPhotoOpen(false);
    setPhotos([]);
    revalidator.revalidate();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!photoAnalysisEnabled}
        title={
          photoAnalysisEnabled
            ? undefined
            : "Enable inventory photo analysis in Settings"
        }
        onClick={() => setPhotoOpen(true)}
      >
        <ImagePlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Add from photos</span>
      </Button>
      <Button size="sm" onClick={() => setAddOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Add item</span>
      </Button>
      <QuickAddInventoryDialog open={addOpen} onOpenChange={setAddOpen} />
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent>
          <form onSubmit={analyzePhotos}>
            <DialogHeader>
              <DialogTitle>Add inventory from photos</DialogTitle>
              <DialogDescription>
                Choose up to five photos from your gallery or filesystem. Kombu
                will identify visible items and add them to inventory.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="inventory-photos">Photos</FieldLabel>
                <Input
                  id="inventory-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  disabled={analyzing}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => {
                    setPhotos(Array.from(event.target.files ?? []).slice(0, 5));
                    setError(null);
                  }}
                />
                <FieldDescription>
                  {photos.length
                    ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected`
                    : "JPEG, PNG, WebP, or HEIC; 8 MB each."}
                </FieldDescription>
                {error && <p className="text-destructive text-sm">{error}</p>}
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhotoOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!photos.length || analyzing}>
                {analyzing && (
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                )}
                {analyzing ? "Analysing…" : "Analyse and add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
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

function QuickAddInventoryDialog({
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
  const [location, setLocation] = useState<Location>("pantry");
  const [expiresOn, setExpiresOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
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
    if (result.error) return setError(result.error);
    onOpenChange(false);
    setName("");
    setQuantity("1");
    setUnit("");
    setExpiresOn("");
    revalidator.revalidate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Add to inventory</DialogTitle>
            <DialogDescription>
              Record an item without leaving the inventory table.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="quick-inventory-name">Item</FieldLabel>
              <Input
                id="quick-inventory-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                required
                autoFocus
                aria-invalid={Boolean(error)}
              />
              {error && <FieldDescription>{error}</FieldDescription>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="quick-inventory-quantity">
                  Quantity
                </FieldLabel>
                <Input
                  id="quick-inventory-quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="quick-inventory-unit">Unit</FieldLabel>
                <Input
                  id="quick-inventory-unit"
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
                <FieldLabel htmlFor="quick-inventory-expiry">Expiry</FieldLabel>
                <Input
                  id="quick-inventory-expiry"
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
              onClick={() => onOpenChange(false)}
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
  );
}
