import {
  DatabaseIcon,
  DownloadIcon,
  FileJsonIcon,
  KeyIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  type AiProviderConfig,
  createAiProvider,
  createImportJob,
  deleteAiProvider,
  getAiCapabilities,
  getAiProviders,
  getCurrentUser,
  getImportJobs,
  getImportSources,
  getKnownProviders,
  getReadiness,
  getSystemOverview,
  updateAiProvider,
} from "~/lib/api/resources";
import type { Route } from "./+types/settings";

export function meta() {
  return [{ title: "Settings | Kombu" }];
}

export async function loader() {
  const [
    overview,
    user,
    readiness,
    sources,
    jobs,
    aiCapabilities,
    knownProviders,
    aiProviders,
  ] = await Promise.all([
    getSystemOverview(),
    getCurrentUser(),
    getReadiness(),
    getImportSources(),
    getImportJobs(),
    getAiCapabilities(),
    getKnownProviders(),
    getAiProviders(),
  ]);

  return {
    overview,
    user,
    readiness,
    sources,
    jobs,
    aiCapabilities,
    knownProviders,
    aiProviders,
  };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const {
    overview,
    user,
    readiness,
    sources,
    jobs,
    aiCapabilities,
    knownProviders,
    aiProviders,
  } = loaderData;
  const revalidator = useRevalidator();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<AiProviderConfig | null>(null);
  const [formProvider, setFormProvider] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formDefaultModel, setFormDefaultModel] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  function openAddDialog() {
    setEditingProvider(null);
    setFormProvider("");
    setFormLabel("");
    setFormApiKey("");
    setFormBaseUrl("");
    setFormDefaultModel("");
    setDialogOpen(true);
  }

  function openEditDialog(provider: AiProviderConfig) {
    setEditingProvider(provider);
    setFormProvider(provider.provider);
    setFormLabel(provider.label);
    setFormApiKey("");
    setFormBaseUrl(provider.base_url ?? "");
    setFormDefaultModel(provider.default_model);
    setDialogOpen(true);
  }

  function handleProviderTypeChange(value: string) {
    setFormProvider(value);
    const known = knownProviders.data.find((p) => p.key === value);
    if (known && !formLabel) {
      setFormLabel(known.label);
    }
  }

  async function handleSave() {
    const body = {
      provider: formProvider,
      label: formLabel || formProvider,
      api_key: formApiKey,
      base_url: formBaseUrl || null,
      default_model: formDefaultModel,
      is_enabled: editingProvider ? undefined : true,
    };

    if (editingProvider) {
      const updateBody: Record<string, unknown> = {
        provider: formProvider,
        label: formLabel || formProvider,
        default_model: formDefaultModel,
      };
      if (formBaseUrl !== undefined) updateBody.base_url = formBaseUrl || null;
      if (formApiKey) updateBody.api_key = formApiKey;
      await updateAiProvider(
        editingProvider.id,
        updateBody as Partial<AiProviderConfig>,
      );
    } else {
      await createAiProvider(body);
    }

    setDialogOpen(false);
    revalidator.revalidate();
  }

  async function handleToggleEnabled(
    provider: AiProviderConfig,
    checked: boolean,
  ) {
    await updateAiProvider(provider.id, { is_enabled: checked });
    revalidator.revalidate();
  }

  async function handleDelete(id: number) {
    await deleteAiProvider(id);
    setDeleteConfirmId(null);
    revalidator.revalidate();
  }

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Providers</CardTitle>
                <CardDescription>
                  Configure AI providers to power recipe enhancement, shopping
                  suggestions, and inventory analysis. LiteLLM supports OpenAI,
                  Anthropic, OpenRouter, Groq, and more.
                </CardDescription>
              </div>
              <Button size="sm" onClick={openAddDialog}>
                <PlusIcon data-icon="inline-start" />
                Add Provider
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiProviders.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <span className="text-muted-foreground text-sm">
                        No AI providers configured yet. Add one to get started.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  aiProviders.data.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="size-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {provider.label}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {provider.provider}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {provider.default_model}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={provider.is_enabled}
                            onCheckedChange={(checked) =>
                              handleToggleEnabled(provider, checked)
                            }
                            aria-label={`Toggle ${provider.label}`}
                          />
                          <span className="text-muted-foreground text-xs">
                            {provider.is_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(provider)}
                            aria-label={`Edit ${provider.label}`}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteConfirmId(provider.id)}
                            aria-label={`Delete ${provider.label}`}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {aiProviders.data.length > 0 && (
              <div className="mt-4 rounded-md border bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  API keys are stored encrypted via the application secret. The
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    {" "}
                    KOMBU_SECRET_KEY
                  </code>{" "}
                  environment variable is used as the encryption key.
                </p>
              </div>
            )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Edit Provider" : "Add AI Provider"}
            </DialogTitle>
            <DialogDescription>
              Configure an AI provider for LiteLLM. API keys are encrypted at
              rest.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider-type">Provider Type</Label>
              <Select
                value={formProvider}
                onValueChange={handleProviderTypeChange}
                disabled={!!editingProvider}
              >
                <SelectTrigger id="provider-type" className="w-full">
                  <SelectValue placeholder="Select a provider..." />
                </SelectTrigger>
                <SelectContent>
                  {knownProviders.data.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider-label">Label</Label>
              <Input
                id="provider-label"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="My OpenAI Account"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider-api-key">API Key</Label>
              <Input
                id="provider-api-key"
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder={
                  editingProvider ? "Leave blank to keep current" : "sk-..."
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider-base-url">Base URL (optional)</Label>
              <Input
                id="provider-base-url"
                value={formBaseUrl}
                onChange={(e) => setFormBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <p className="text-muted-foreground text-xs">
                Custom endpoint for proxies like OpenRouter or LiteLLM.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider-default-model">Default Model</Label>
              <Input
                id="provider-default-model"
                value={formDefaultModel}
                onChange={(e) => setFormDefaultModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formProvider ||
                !formDefaultModel ||
                (!editingProvider && !formApiKey)
              }
            >
              {editingProvider ? "Save Changes" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this provider? Any features using
              it will stop working until another provider is configured.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmId !== null && handleDelete(deleteConfirmId)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
