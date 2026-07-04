import { BotIcon, SendIcon, SparklesIcon } from "lucide-react";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { getAiCapabilities } from "~/lib/api/resources";
import type { Route } from "./+types/ai";

export function meta() {
  return [{ title: "AI Lab | Kombu" }];
}

export async function loader() {
  const capabilities = await getAiCapabilities();
  return { capabilities };
}

export default function AiLab({ loaderData }: Route.ComponentProps) {
  const { capabilities } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="AI lab"
        title="Smart features stay provider-neutral until a self-hoster opts in."
        description="Kombu can plan meals, map imports, and reason about inventory without baking a vendor key into the project."
        actions={
          <>
            <Button variant="outline">
              <SparklesIcon data-icon="inline-start" />
              Review adapters
            </Button>
            <Button>
              <SendIcon data-icon="inline-start" />
              Save prompt
            </Button>
          </>
        }
      />

      <SourceNotice results={[capabilities]} />

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Capabilities</CardTitle>
            <CardDescription>
              Feature flags come from the API and are disabled by default.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {capabilities.data.map((capability) => (
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
            <CardTitle>Prompt workbench</CardTitle>
            <CardDescription>
              A UI shell for recipe planning, import mapping, and inventory
              insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ai-context">Context</FieldLabel>
                <Textarea
                  id="ai-context"
                  placeholder="Inventory, expiry windows, dietary notes, and user preferences."
                  readOnly
                />
                <FieldDescription>
                  External providers are not called by the scaffold.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ai-prompt">Prompt</FieldLabel>
                <Textarea
                  id="ai-prompt"
                  placeholder="What can I cook tonight before the spinach expires?"
                  readOnly
                />
              </Field>
              <div className="flex justify-end">
                <Button>
                  <BotIcon data-icon="inline-start" />
                  Generate suggestion
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
