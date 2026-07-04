import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { ApiResult } from "~/lib/api/client";

type SourceNoticeProps = {
  results: ApiResult<unknown>[];
};

export function SourceNotice({ results }: SourceNoticeProps) {
  const fallback = results.find((result) => result.source === "fallback");

  if (!fallback) {
    return null;
  }

  return (
    <Alert>
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>Using starter data</AlertTitle>
      <AlertDescription>
        The API did not return live data yet. Layouts remain usable while the
        backend, database, or containers start.
      </AlertDescription>
    </Alert>
  );
}
