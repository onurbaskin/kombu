import {
  DatabaseIcon,
  DownloadIcon,
  FileJsonIcon,
  KeyIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useEffect } from "react";
import { useRevalidator } from "react-router";
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  createImportJob,
  getAiCapabilities,
  getCurrentUser,
  getImportJobs,
  getImportSources,
  getReadiness,
  getSystemOverview,
} from "~/lib/api/resources";
import type { Route } from "./+types/settings";

export function meta() {
  return [{ title: "Settings | Kombu" }];
}

export async function loader() {
  const [overview, user, readiness, sources, jobs, aiCapabilities] =
    await Promise.all([
      getSystemOverview(),
      getCurrentUser(),
      getReadiness(),
      getImportSources(),
      getImportJobs(),
      getAiCapabilities(),
    ]);

  return { overview, user, readiness, sources, jobs, aiCapabilities };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { overview, user, readiness, sources, jobs, aiCapabilities } =
    loaderData;
  const revalidator = useRevalidator();

  useEffect(() => {
    const hasRunningJobs = jobs.data.some((j) => j.status === "running");
    if (!hasRunningJobs) return;
    const interval = setInterval(() => revalidator.revalidate(), 3000);
    return () => clearInterval(interval);
  }, [jobs.data, revalidator]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Self-hosting controls start visible, even while auth grows up."
        description="This page frames deployment state, local identity, future SSO, and feature flags without exposing private infrastructure."
      />

      <SourceNotice results={[overview, user, readiness, sources, jobs]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <CardDescription>
              Environment and readiness details for operators.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between rounded-md border p-4">
              <span className="font-medium">Environment</span>
              <Badge variant="outline">{overview.data.environment}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <span className="font-medium">Database</span>
              <StatusBadge value={readiness.data.database} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-4">
              <span className="font-medium">Service</span>
              <StatusBadge value={readiness.data.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User management</CardTitle>
            <CardDescription>
              Local identity placeholder with room for OIDC/SAML later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-md border p-4">
              <ShieldCheckIcon aria-hidden="true" />
              <div>
                <p className="font-medium">{user.data.display_name}</p>
                <p className="text-muted-foreground text-sm">
                  {user.data.email} via {user.data.auth_provider}
                </p>
              </div>
              <Badge className="ml-auto">{user.data.role}</Badge>
            </div>
            <FieldGroup>
              <Field orientation="horizontal" data-disabled>
                <FieldContent>
                  <FieldTitle>Allow local accounts</FieldTitle>
                  <FieldDescription>
                    Useful for first boot before SSO is configured.
                  </FieldDescription>
                </FieldContent>
                <Switch checked aria-label="Allow local accounts" disabled />
              </Field>
              <Field orientation="horizontal" data-disabled>
                <FieldContent>
                  <FieldTitle>Require SSO</FieldTitle>
                  <FieldDescription>
                    Planned for multi-user and company deployments.
                  </FieldDescription>
                </FieldContent>
                <Switch aria-label="Require SSO" disabled />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>
            Public defaults keep advanced integrations explicit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {overview.data.features.map((feature) => (
              <Field key={feature.key} orientation="horizontal" data-disabled>
                <FieldContent>
                  <FieldLabel>{feature.label}</FieldLabel>
                  <FieldDescription>{feature.description}</FieldDescription>
                </FieldContent>
                <Switch
                  checked={feature.enabled}
                  aria-label={feature.label}
                  disabled
                />
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Capabilities</CardTitle>
          <CardDescription>
            Provider-neutral AI features are gated by the{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              KOMBU_AI_FEATURES_ENABLED
            </code>{" "}
            setting. Enable it to activate recipe planning, inventory insights,
            and import assistance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {aiCapabilities.data.map((capability) => (
            <div key={capability.key} className="rounded-md border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{capability.label}</span>
                <StatusBadge
                  value={capability.enabled ? "enabled" : "planned"}
                />
              </div>
              <p className="mt-2 text-muted-foreground text-sm">
                {capability.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipe Sources</CardTitle>
          <CardDescription>
            Configure open-source recipe datasets to enrich your cookbook with
            millions of recipes. Download once, browse forever.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Description
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.data.map((source) => {
                const isKaggle = source.key === "kaggle-recipes";
                const isReady = source.ready_for_import;

                let statusLabel = "Planned";

                if (isReady) {
                  statusLabel = "Ready";
                } else if (isKaggle) {
                  statusLabel = "Requires API Key";
                }

                return (
                  <TableRow key={source.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isKaggle ? (
                          <DatabaseIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <FileJsonIcon className="size-4 text-muted-foreground" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {source.label}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {source.key}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-muted-foreground text-sm">
                        {source.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={statusLabel} />
                    </TableCell>
                    <TableCell className="text-right">
                      {isKaggle && !isReady ? (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href="https://www.kaggle.com/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <KeyIcon data-icon="inline-start" />
                            Configure Kaggle
                          </a>
                        </Button>
                      ) : isReady ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await createImportJob({
                                source_name: source.label,
                                source_type: source.source_type,
                              });
                              window.location.reload();
                            } catch {
                              // Silently fail — user can try again
                            }
                          }}
                        >
                          <DownloadIcon data-icon="inline-start" />
                          Download
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <PlusIcon data-icon="inline-start" />
                          Coming soon
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {jobs.data.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-sm">Import Jobs</h4>
                {jobs.data.map((job) => {
                  const progress =
                    job.total_records > 0
                      ? Math.round(
                          (job.imported_records / job.total_records) * 100,
                        )
                      : 0;

                  return (
                    <div
                      key={job.id}
                      className="flex flex-col gap-2 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {job.status === "running" && (
                            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {job.source_name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {job.imported_records.toLocaleString()}
                              {" / "}
                              {job.total_records > 0
                                ? job.total_records.toLocaleString()
                                : "—"}{" "}
                              recipes
                            </p>
                          </div>
                        </div>
                        <StatusBadge value={job.status} />
                      </div>
                      {job.status === "running" && (
                        <Progress value={progress} className="h-2" />
                      )}
                      {job.status === "failed" && job.error_message && (
                        <p className="text-destructive text-xs">
                          {job.error_message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-4 rounded-md border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Kaggle API credentials are configured via the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                KAGGLE_USERNAME
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                KAGGLE_KEY
              </code>{" "}
              environment variables (see{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                .env.example
              </code>
              ). Once set, the Kaggle source will show as Ready and you can
              download the 2M+ recipe dataset.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
