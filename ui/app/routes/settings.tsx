import {
  DownloadIcon,
  KeyRoundIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRevalidator } from "react-router";
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
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
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
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
  getManagedUsers,
  getSystemOverview,
  getUserInvites,
  inviteUser,
  saveImportCredential,
  updateAiCapability,
  updateAiProvider,
  updateFeatureFlag,
  updateManagedUser,
} from "~/lib/api/resources";
import type { Route } from "./+types/settings";

const OPEN_PROVIDER_EVENT = "kombu:settings:add-provider";
const OPEN_INVITE_EVENT = "kombu:settings:invite-user";

export function meta() {
  return [{ title: "Settings | Kombu" }];
}

export const handle = {
  topbar: function SettingsTopbar() {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new Event(OPEN_INVITE_EVENT))}
        >
          <UserPlusIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Invite user</span>
        </Button>
        <Button
          size="sm"
          onClick={() => window.dispatchEvent(new Event(OPEN_PROVIDER_EVENT))}
        >
          <PlusIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Add provider</span>
        </Button>
      </>
    );
  },
};

export async function loader() {
  const [
    overview,
    user,
    sources,
    jobs,
    aiCapabilities,
    knownProviders,
    aiProviders,
    users,
    invites,
  ] = await Promise.all([
    getSystemOverview(),
    getCurrentUser(),
    getImportSources(),
    getImportJobs(),
    getAiCapabilities(),
    getKnownProviders(),
    getAiProviders(),
    getManagedUsers(),
    getUserInvites(),
  ]);
  return {
    overview,
    user,
    sources,
    jobs,
    aiCapabilities,
    knownProviders,
    aiProviders,
    users,
    invites,
  };
}

type Role = "admin" | "editor" | "viewer";

export default function Settings({ loaderData }: Route.ComponentProps) {
  const {
    overview,
    user,
    sources,
    jobs,
    aiCapabilities,
    knownProviders,
    aiProviders,
    users,
    invites,
  } = loaderData;
  const revalidator = useRevalidator();
  const isAdmin = user.data.role === "admin";
  const [providerOpen, setProviderOpen] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<AiProviderConfig | null>(null);
  const [providerType, setProviderType] = useState("");
  const [providerLabel, setProviderLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [credentialSource, setCredentialSource] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [secret, setSecret] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openProvider = useCallback((provider?: AiProviderConfig) => {
    setEditingProvider(provider ?? null);
    setProviderType(provider?.provider ?? "");
    setProviderLabel(provider?.label ?? "");
    setApiKey("");
    setBaseUrl(provider?.base_url ?? "");
    setModel(provider?.default_model ?? "");
    setError(null);
    setProviderOpen(true);
  }, []);

  useEffect(() => {
    const addProvider = () => openProvider();
    const invite = () => setInviteOpen(true);
    window.addEventListener(OPEN_PROVIDER_EVENT, addProvider);
    window.addEventListener(OPEN_INVITE_EVENT, invite);
    return () => {
      window.removeEventListener(OPEN_PROVIDER_EVENT, addProvider);
      window.removeEventListener(OPEN_INVITE_EVENT, invite);
    };
  }, [openProvider]);

  async function saveProvider() {
    setBusyKey("provider");
    setError(null);
    const result = editingProvider
      ? await updateAiProvider(editingProvider.id, {
          label: providerLabel,
          default_model: model,
          base_url: baseUrl || null,
          ...(apiKey ? { api_key: apiKey } : {}),
        })
      : await createAiProvider({
          provider: providerType,
          label: providerLabel,
          api_key: apiKey,
          base_url: baseUrl || null,
          default_model: model,
        });
    setBusyKey(null);
    if (result.error) return setError(result.error);
    setProviderOpen(false);
    revalidator.revalidate();
  }

  async function saveInvite() {
    setBusyKey("invite");
    const result = await inviteUser({ email: inviteEmail, role: inviteRole });
    setBusyKey(null);
    if (result.error) return setError(result.error);
    setInviteOpen(false);
    setInviteEmail("");
    revalidator.revalidate();
  }

  async function toggleFeature(key: string, enabled: boolean) {
    setBusyKey(`feature:${key}`);
    const result = await updateFeatureFlag(key, enabled);
    setBusyKey(null);
    if (result.error) setError(result.error);
    revalidator.revalidate();
  }

  async function toggleCapability(key: string, enabled: boolean) {
    setBusyKey(`capability:${key}`);
    const result = await updateAiCapability(key, enabled);
    setBusyKey(null);
    if (result.error) setError(result.error);
    revalidator.revalidate();
  }

  async function saveCredential() {
    if (!credentialSource) return;
    setBusyKey("credential");
    const result = await saveImportCredential(credentialSource, {
      account_name: accountName,
      secret,
    });
    setBusyKey(null);
    if (result.error) return setError(result.error);
    setCredentialSource(null);
    setSecret("");
    revalidator.revalidate();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <SourceNotice results={[overview, user, sources, jobs]} />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <SettingsSection
        title="AI providers"
        description="Models and encrypted credentials used by optional AI tools."
      >
        {aiProviders.data.length ? (
          aiProviders.data.map((provider) => (
            <SettingsRow
              key={provider.id}
              title={provider.label}
              description={`${provider.provider} · ${provider.default_model}`}
            >
              <Switch
                checked={provider.is_enabled}
                onCheckedChange={(enabled) =>
                  void updateAiProvider(provider.id, {
                    is_enabled: enabled,
                  }).then(() => revalidator.revalidate())
                }
                disabled={!isAdmin}
                aria-label={`Enable ${provider.label}`}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openProvider(provider)}
                aria-label={`Edit ${provider.label}`}
              >
                <PencilIcon />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  void deleteAiProvider(provider.id).then(() =>
                    revalidator.revalidate(),
                  )
                }
                aria-label={`Delete ${provider.label}`}
              >
                <Trash2Icon />
              </Button>
            </SettingsRow>
          ))
        ) : (
          <SettingsRow
            title="No provider configured"
            description="Add a provider to enable AI capabilities."
          >
            <Button size="sm" variant="outline" onClick={() => openProvider()}>
              Add provider
            </Button>
          </SettingsRow>
        )}
      </SettingsSection>

      <SettingsSection
        title="Feature access"
        description="Deployment-wide controls enforced by the API."
      >
        {overview.data.features.map((feature) => (
          <SettingsRow
            key={feature.key}
            title={feature.label}
            description={feature.description}
          >
            <Switch
              checked={feature.enabled}
              disabled={!isAdmin || busyKey === `feature:${feature.key}`}
              onCheckedChange={(enabled) =>
                void toggleFeature(feature.key, enabled)
              }
              aria-label={`Enable ${feature.label}`}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection
        title="AI capabilities"
        description="Choose which AI actions appear and can run."
      >
        {aiCapabilities.data.map((capability) => (
          <SettingsRow
            key={capability.key}
            title={capability.label}
            description={capability.description}
          >
            <Switch
              checked={capability.enabled}
              disabled={
                !isAdmin ||
                !overview.data.features.find((item) => item.key === "ai")
                  ?.enabled ||
                busyKey === `capability:${capability.key}`
              }
              onCheckedChange={(enabled) =>
                void toggleCapability(capability.key, enabled)
              }
              aria-label={`Enable ${capability.label}`}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      {isAdmin ? (
        <SettingsSection
          title="User management"
          description="Invite people and control what they can change."
        >
          {users.data.map((managedUser) => (
            <SettingsRow
              key={managedUser.id}
              title={managedUser.display_name}
              description={managedUser.email}
            >
              <Select
                value={managedUser.role}
                onValueChange={(role: Role) =>
                  void updateManagedUser(managedUser.id, { role }).then(() =>
                    revalidator.revalidate(),
                  )
                }
              >
                <SelectTrigger
                  className="w-28"
                  aria-label={`Role for ${managedUser.display_name}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {["admin", "editor", "viewer"].map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Switch
                checked={managedUser.is_active}
                onCheckedChange={(is_active) =>
                  void updateManagedUser(managedUser.id, { is_active }).then(
                    () => revalidator.revalidate(),
                  )
                }
                aria-label={`Active ${managedUser.display_name}`}
              />
            </SettingsRow>
          ))}
          {invites.data.map((invite) => (
            <SettingsRow
              key={`invite-${invite.id}`}
              title={invite.email}
              description="Invitation pending"
            >
              <Badge variant="secondary">{invite.role}</Badge>
            </SettingsRow>
          ))}
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Recipe sources"
        description="Sources are maintained by Kombu; credentials remain encrypted on this instance."
      >
        {sources.data.map((source) => (
          <SettingsRow
            key={source.key}
            title={source.label}
            description={source.description}
          >
            <StatusBadge
              value={source.ready_for_import ? "ready" : "credentials required"}
            />
            {!source.ready_for_import && source.key === "kaggle-recipes" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCredentialSource(source.key);
                  setError(null);
                }}
              >
                <KeyRoundIcon data-icon="inline-start" /> Configure
              </Button>
            ) : source.ready_for_import ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void createImportJob({
                    source_name: source.label,
                    source_type: source.source_type,
                  }).then(() => revalidator.revalidate())
                }
              >
                <DownloadIcon data-icon="inline-start" /> Import
              </Button>
            ) : null}
          </SettingsRow>
        ))}
        {jobs.data.slice(0, 3).map((job) => (
          <SettingsRow
            key={`job-${job.id}`}
            title={job.source_name}
            description={`${job.imported_records.toLocaleString()} of ${job.total_records.toLocaleString()} recipes`}
          >
            {job.status === "running" ? (
              <Loader2Icon
                className="animate-spin"
                aria-label="Import running"
              />
            ) : (
              <StatusBadge value={job.status} />
            )}
          </SettingsRow>
        ))}
      </SettingsSection>

      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? "Edit provider" : "Add provider"}
            </DialogTitle>
            <DialogDescription>
              Credentials are encrypted using KOMBU_ENCRYPTION_KEY before
              storage.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Provider</FieldLabel>
              <Select
                value={providerType}
                onValueChange={(value) => {
                  setProviderType(value);
                  const known = knownProviders.data.find(
                    (item) => item.key === value,
                  );
                  if (known) setProviderLabel(known.label);
                }}
                disabled={Boolean(editingProvider)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {knownProviders.data.map((provider) => (
                      <SelectItem key={provider.key} value={provider.key}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-label">Label</FieldLabel>
              <Input
                id="provider-label"
                value={providerLabel}
                onChange={(event) => setProviderLabel(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-key">API key</FieldLabel>
              <Input
                id="provider-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  editingProvider ? "Leave blank to keep current" : "Required"
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-model">Default model</FieldLabel>
              <Input
                id="provider-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-url">Base URL</FieldLabel>
              <Input
                id="provider-url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="Optional"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveProvider()}
              disabled={
                busyKey === "provider" ||
                !providerType ||
                !model ||
                (!editingProvider && !apiKey)
              }
            >
              Save provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              Editors manage kitchen data. Viewers have read-only access.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={inviteRole}
                onValueChange={(role: Role) => setInviteRole(role)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveInvite()}
              disabled={!inviteEmail || busyKey === "invite"}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={credentialSource !== null}
        onOpenChange={(open) => !open && setCredentialSource(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure recipe source</DialogTitle>
            <DialogDescription>
              The secret is encrypted before it is saved to SQLite.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="source-account">Account name</FieldLabel>
              <Input
                id="source-account"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="source-secret">API secret</FieldLabel>
              <Input
                id="source-secret"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialSource(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveCredential()}
              disabled={!accountName || !secret || busyKey === "credential"}
            >
              Save credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`settings-${title.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="mb-2 px-1">
        <h2
          id={`settings-${title.toLowerCase().replaceAll(" ", "-")}`}
          className="font-semibold text-sm text-balance"
        >
          {title}
        </h2>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Field orientation="horizontal" className="min-h-16 px-4 py-3">
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          <FieldDescription className="line-clamp-2">
            {description}
          </FieldDescription>
        </FieldContent>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </Field>
      <Separator className="last:hidden" />
    </>
  );
}
