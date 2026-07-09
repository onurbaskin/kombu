import { BellIcon, PlusIcon } from "lucide-react";
import { MetricCard } from "~/components/metric-card";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { StatusBadge } from "~/components/status-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getExpiryAlerts, getInventory } from "~/lib/api/resources";
import type { Route } from "./+types/inventory";

export const handle = {
  topbar: function InventoryTopbar() {
    return (
      <>
        <Button variant="outline">
          <BellIcon data-icon="inline-start" />
          Expiry rules
        </Button>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add item
        </Button>
      </>
    );
  },
};

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

export default function Inventory({ loaderData }: Route.ComponentProps) {
  const { inventory, alerts } = loaderData;
  const expiringCount = alerts.data.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Know what is in the kitchen before planning what to cook."
        description="Track pantry, fridge, freezer, and counter stock with expiry data ready for alerts and AI planning."
      />

      <SourceNotice results={[inventory, alerts]} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Tracked items"
          value={inventory.data.length}
          description="Items currently visible to the inventory API."
        />
        <MetricCard
          label="Expiry alerts"
          value={expiringCount}
          description="Items that need attention in the next 14 days."
        />
        <MetricCard
          label="Locations"
          value={new Set(inventory.data.map((item) => item.location)).size}
          description="Storage areas represented by current inventory."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Stock ledger</CardTitle>
            <CardDescription>
              The API stores quantities, units, locations, sources, and expiry
              dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.location}</Badge>
                    </TableCell>
                    <TableCell>{item.expires_on ?? "Not set"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick add</CardTitle>
            <CardDescription>
              Form layout for manual entry, barcode lookup, or receipt
              extraction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="inventory-item">Item</FieldLabel>
                <Input
                  id="inventory-item"
                  placeholder="Greek yoghurt"
                  readOnly
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="inventory-expiry">Expiry date</FieldLabel>
                <Input id="inventory-expiry" type="date" readOnly />
                <FieldDescription>
                  Expiry alerts use the same field exposed by the API.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expiry alert queue</CardTitle>
          <CardDescription>
            Sorted by urgency for cooking decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alerts.data.map((alert) => (
            <div
              key={alert.item_id}
              className="flex flex-col gap-2 rounded-md border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{alert.name}</span>
                <StatusBadge value={alert.severity} />
              </div>
              <p className="text-muted-foreground text-sm">
                {alert.location} - {alert.days_until_expiry} days remaining
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
