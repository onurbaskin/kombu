import { CameraIcon, ScanBarcodeIcon, UploadIcon } from "lucide-react";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
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
import { getScannerCapabilities, getScanSessions } from "~/lib/api/resources";
import type { Route } from "./+types/scanner";

export const handle = {
  topbar: function ScannerTopbar() {
    return (
      <>
        <Button variant="outline">
          <UploadIcon data-icon="inline-start" />
          Upload receipt
        </Button>
        <Button>
          <CameraIcon data-icon="inline-start" />
          Start capture
        </Button>
      </>
    );
  },
};

export function meta() {
  return [{ title: "Scanner | Kombu" }];
}

export async function loader() {
  const [capabilities, sessions] = await Promise.all([
    getScannerCapabilities(),
    getScanSessions(),
  ]);

  return { capabilities, sessions };
}

export default function Scanner({ loaderData }: Route.ComponentProps) {
  const { capabilities, sessions } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Scanner"
        title="Camera and hardware capture should feed the same kitchen graph."
        description="Kombu leaves room for browser camera scans, barcode scanners, receipts, and dedicated kitchen hardware."
      />

      <SourceNotice results={[capabilities, sessions]} />

      <div className="grid gap-4 md:grid-cols-3">
        {capabilities.data.map((capability) => (
          <Card key={capability.key}>
            <CardHeader>
              <CardTitle>{capability.label}</CardTitle>
              <CardDescription>{capability.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant={capability.requires_hardware ? "outline" : "default"}
              >
                {capability.requires_hardware ? "hardware" : "browser-ready"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Capture setup</CardTitle>
            <CardDescription>
              A layout for camera, barcode, receipt, or dedicated scanner
              handoff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="scan-type">Scan type</FieldLabel>
                <Input id="scan-type" placeholder="barcode" readOnly />
              </Field>
              <Field>
                <FieldLabel htmlFor="device-hint">Device hint</FieldLabel>
                <Input
                  id="device-hint"
                  placeholder="kitchen scanner"
                  readOnly
                />
                <FieldDescription>
                  Device workers can claim sessions through the API later.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Capture requests are stored so agents and humans can process them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.data.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ScanBarcodeIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No scanner sessions</EmptyTitle>
                  <EmptyDescription>
                    Start a capture from the camera, upload a receipt, or attach
                    hardware.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button>Start first session</Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.data.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.scan_type}</TableCell>
                      <TableCell>
                        {session.device_hint ?? "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={session.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
