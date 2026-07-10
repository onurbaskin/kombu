import { ArrowRightIcon, CircleCheckIcon, CircleXIcon } from "lucide-react";
import { Link } from "react-router";

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
import { getReadiness, getSystemOverview } from "~/lib/api/resources";
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
  const [overview, readiness] = await Promise.all([
    getSystemOverview(),
    getReadiness(),
  ]);
  return { overview, readiness };
}

const uiRoutes = new Set([
  "/",
  "/recipes",
  "/inventory",
  "/shopping",
  "/scanner",
  "/settings",
]);

export default function Home({ loaderData }: Route.ComponentProps) {
  const { overview, readiness } = loaderData;
  const quickLinks = overview.data.navigation.filter(
    (item) => item.href !== "/" && uiRoutes.has(item.href),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <SourceNotice results={[overview, readiness]} />
      <PageHeader
        eyebrow="Kitchen command center"
        title="Welcome to Kombu"
        description="Keep recipes, pantry stock, shopping, and capture workflows moving from one place."
        actions={
          <>
            <Button asChild>
              <Link to="/recipes">
                Browse recipes <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/inventory">Add inventory</Link>
            </Button>
          </>
        }
      />

      <section
        aria-labelledby="dashboard-metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <h2 id="dashboard-metrics" className="sr-only">
          Kitchen metrics
        </h2>
        {overview.data.metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            description={metric.description}
          />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Feature access</CardTitle>
            <CardDescription>
              Deployment capabilities currently enforced by the API.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {overview.data.features.map((feature) => (
              <div
                key={feature.key}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                {feature.enabled ? (
                  <CircleCheckIcon
                    className="text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleXIcon
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{feature.label}</p>
                    <StatusBadge
                      value={feature.enabled ? "enabled" : "disabled"}
                    />
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Continue in Kombu</CardTitle>
            <CardDescription>
              Jump into the workflows available in this UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {quickLinks.map((item) => (
              <Button
                key={item.href}
                variant="outline"
                className="justify-between"
                asChild
              >
                <Link to={item.href}>
                  {item.label}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
