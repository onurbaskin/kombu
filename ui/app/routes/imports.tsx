import { DatabaseIcon, FileJsonIcon, PlusIcon } from "lucide-react";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getImportJobs, getImportSources } from "~/lib/api/resources";
import type { Route } from "./+types/imports";

export const handle = {
  topbar: function ImportsTopbar() {
    return (
      <>
        <Button variant="outline">
          <FileJsonIcon data-icon="inline-start" />
          Validate mapping
        </Button>
        <Button>
          <PlusIcon data-icon="inline-start" />
          Queue import
        </Button>
      </>
    );
  },
};

export function meta() {
  return [{ title: "Imports | Kombu" }];
}

export async function loader() {
  const [sources, jobs] = await Promise.all([
    getImportSources(),
    getImportJobs(),
  ]);
  return { sources, jobs };
}

export default function Imports({ loaderData }: Route.ComponentProps) {
  const { sources, jobs } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Recipe imports"
        title="Millions of recipes are useful when users ask for them."
        description="Kombu prepares import sources for datasets, JSON, CSV, and web captures without making imports the center of the product."
      />

      <SourceNotice results={[sources, jobs]} />

      <div className="grid gap-4 md:grid-cols-3">
        {sources.data.map((source) => (
          <Card key={source.key}>
            <CardHeader>
              <CardTitle>{source.label}</CardTitle>
              <CardDescription>{source.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Badge variant="outline">{source.source_type}</Badge>
              <StatusBadge
                value={source.ready_for_import ? "ready" : "planned"}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import jobs</CardTitle>
          <CardDescription>
            Jobs are durable records so imports can become background workers
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <DatabaseIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No import jobs queued</EmptyTitle>
                <EmptyDescription>
                  Choose a source, map fields, and queue the first import.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.data.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.source_name}</TableCell>
                    <TableCell>{job.source_type}</TableCell>
                    <TableCell>
                      {job.imported_records}/{job.total_records}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={job.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
