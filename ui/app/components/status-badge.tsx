import { Badge } from "~/components/ui/badge";

type StatusBadgeProps = {
  value: string;
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const variant =
    value === "urgent" || value === "expired" || value === "failed"
      ? "destructive"
      : value === "enabled" || value === "ready" || value === "ok"
        ? "default"
        : value === "purchased" || value === "completed"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{value}</Badge>;
}
