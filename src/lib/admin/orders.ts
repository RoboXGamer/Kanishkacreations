export const ORDER_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  awaiting_confirmation: "Awaiting confirmation",
  confirmed: "Confirmed",
  cancel_requested: "Cancel requested",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const ORDER_STATUS_TONES: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  awaiting_confirmation:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  confirmed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  cancel_requested:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  cancelled: "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-300",
  completed: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200",
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  unstarted: "Unstarted",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const FULFILLMENT_STATUS_TONES: Record<string, string> = {
  unstarted: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
  packed:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
  shipped:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  not_requested: "Not requested",
  requested: "Requested",
  pending: "Pending",
  refunded: "Refunded",
  rejected: "Rejected",
};

export const REFUND_STATUS_TONES: Record<string, string> = {
  not_requested:
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  requested:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
  refunded:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
};

export function getOrderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function getFulfillmentStatusLabel(status: string) {
  return FULFILLMENT_STATUS_LABELS[status] ?? status;
}

export function getRefundStatusLabel(status: string) {
  return REFUND_STATUS_LABELS[status] ?? status;
}

export function getOrderStatusTone(status: string) {
  return (
    ORDER_STATUS_TONES[status] ??
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
  );
}

export function getFulfillmentStatusTone(status: string) {
  return (
    FULFILLMENT_STATUS_TONES[status] ??
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
  );
}

export function getRefundStatusTone(status: string) {
  return (
    REFUND_STATUS_TONES[status] ??
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
  );
}

export function getInitialFulfillmentStatus(orderStatus: string) {
  switch (orderStatus) {
    case "confirmed":
      return "processing";
    case "completed":
      return "delivered";
    default:
      return "unstarted";
  }
}
