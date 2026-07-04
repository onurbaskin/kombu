import { ShieldCheckIcon } from "lucide-react";
import { PageHeader } from "~/components/page-header";
import { SourceNotice } from "~/components/source-notice";
import { StatusBadge } from "~/components/status-badge";
import { Badge } from "~/components/ui/badge";
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
import { Switch } from "~/components/ui/switch";
import {
  getCurrentUser,
  getReadiness,
  getSystemOverview,
} from "~/lib/api/resources";
import type { Route } from "./+types/settings";

export function meta() {
  return [{ title: "Settings | Kombu" }];
}

export async function loader() {
  const [overview, user, readiness] = await Promise.all([
    getSystemOverview(),
    getCurrentUser(),
    getReadiness(),
  ]);

  return { overview, user, readiness };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { overview, user, readiness } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Self-hosting controls start visible, even while auth grows up."
        description="This page frames deployment state, local identity, future SSO, and feature flags without exposing private infrastructure."
      />

      <SourceNotice results={[overview, user, readiness]} />

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
    </div>
  );
}
