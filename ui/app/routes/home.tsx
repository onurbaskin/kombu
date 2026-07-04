import { AlertTriangleIcon, PlusIcon } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  getCurrentUser,
  getExpiryAlerts,
  getSystemOverview,
} from "~/lib/api/resources";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "Kombu" },
    {
      name: "description",
      content:
        "A self-hostable kitchen OS for recipes, inventory, and shopping.",
    },
  ];
}

export async function loader() {
  const [overview, alerts, user] = await Promise.all([
    getSystemOverview(),
    getExpiryAlerts(),
    getCurrentUser(),
  ]);

  return { overview, alerts, user };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { overview, alerts, user } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Kitchen command center"
        title="Cook what people actually make, then import the universe."
        description="Kombu starts with user-cooked recipes and connects inventory, expiry alerts, shopping, scanners, imports, and AI-ready workflows."
        actions={
          <>
            <Button variant="outline">
              <AlertTriangleIcon data-icon="inline-start" />
              Review alerts
            </Button>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Capture recipe
            </Button>
          </>
        }
      />

      <SourceNotice results={[overview, alerts, user]} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.data.metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            description={metric.description}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Kitchen flow</CardTitle>
            <CardDescription>
              The first screen is operational: cook, scan, import, and plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="today">
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="smart">Smart</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="mt-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    "Capture cooked recipes",
                    "Use what expires first",
                    "Turn missing items into shopping",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-md border bg-card p-4 text-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="stock" className="mt-4">
                <p className="text-muted-foreground text-sm">
                  Inventory, expiry alerts, and scanner sessions are already
                  represented in the API contract.
                </p>
              </TabsContent>
              <TabsContent value="smart" className="mt-4">
                <p className="text-muted-foreground text-sm">
                  AI is provider-neutral and disabled by default until a
                  self-hoster configures their own adapter.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiry watch</CardTitle>
            <CardDescription>
              Items that should influence recipe suggestions first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.data.map((alert) => (
                  <TableRow key={alert.item_id}>
                    <TableCell>{alert.name}</TableCell>
                    <TableCell>{alert.location}</TableCell>
                    <TableCell>
                      <StatusBadge value={alert.severity} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployment features</CardTitle>
          <CardDescription>
            Current feature posture for {user.data.display_name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overview.data.features.map((feature) => (
            <div
              key={feature.key}
              className="flex flex-col gap-2 rounded-md border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{feature.label}</span>
                <Badge variant={feature.enabled ? "default" : "outline"}>
                  {feature.enabled ? "enabled" : "planned"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
