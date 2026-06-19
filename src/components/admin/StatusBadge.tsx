import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  not_confirmed: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-orange-100 text-orange-700",
  canceled: "bg-red-100 text-red-600",
};

export function StatusBadge({
  status,
  label,
}: {
  status: OrderStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}
