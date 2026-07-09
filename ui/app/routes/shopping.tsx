import { CheckIcon, PlusIcon } from "lucide-react";
import { MetricCard } from "~/components/metric-card";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { StatusBadge } from "~/components/status-badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getShoppingItems } from "~/lib/api/resources";
import type { Route } from "./+types/shopping";

export const handle = {
  topbar: function ShoppingTopbar() {
    return (
      <>
        <Button variant="outline">
          <CheckIcon data-icon="inline-start" />
          Mark trip complete
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
  return [{ title: "Shopping | Kombu" }];
}

export async function loader() {
  const shopping = await getShoppingItems();
  return { shopping };
}

export default function Shopping({ loaderData }: Route.ComponentProps) {
  const { shopping } = loaderData;
  const needed = shopping.data.filter((item) => item.status === "needed");
  const purchased = shopping.data.filter((item) => item.status === "purchased");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Shopping"
        title="Turn missing ingredients and low stock into a shared list."
        description="Shopping starts from recipes, inventory thresholds, scanner sessions, and direct user entry."
      />

      <SourceNotice results={[shopping]} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Needed"
          value={needed.length}
          description="Items still waiting to be bought."
        />
        <MetricCard
          label="Purchased"
          value={purchased.length}
          description="Items marked complete during the current trip."
        />
        <MetricCard
          label="Categories"
          value={
            new Set(shopping.data.map((item) => item.category ?? "Other")).size
          }
          description="Groups ready for a store-friendly layout."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shopping list</CardTitle>
          <CardDescription>
            One table for humans, agents, and future mobile or scanner flows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="needed">
            <TabsList>
              <TabsTrigger value="needed">Needed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="purchased">Purchased</TabsTrigger>
            </TabsList>
            <TabsContent value="needed" className="mt-4">
              <ShoppingTable items={needed} />
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <ShoppingTable items={shopping.data} />
            </TabsContent>
            <TabsContent value="purchased" className="mt-4">
              <ShoppingTable items={purchased} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ShoppingTable({
  items,
}: {
  items: Route.ComponentProps["loaderData"]["shopping"]["data"];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              {item.quantity} {item.unit}
            </TableCell>
            <TableCell>{item.category ?? "Other"}</TableCell>
            <TableCell>
              <StatusBadge value={item.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
