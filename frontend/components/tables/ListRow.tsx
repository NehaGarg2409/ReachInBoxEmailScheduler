import clsx from "clsx";
import type { EmailStatus } from "../../lib/types";

export function ListRow({
  toLabel,
  subject,
  preview,
  timeLabel,
  status,
  onClick,
}: {
  toLabel: string;
  subject: string;
  preview: string;
  timeLabel: string;
  status?: EmailStatus;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-paper-border px-4 py-3 text-left hover:bg-paper/70"
    >
      <span className="w-40 shrink-0 truncate text-sm font-medium text-ink">{toLabel}</span>

      <TimePill label={timeLabel} status={status} />

      <span className="min-w-0 flex-1 truncate text-sm text-ink">
        <span className="font-medium">{subject}</span>
        <span className="text-muted"> - {preview}</span>
      </span>

      <StarIcon />
    </button>
  );
}

export function TimePill({ label, status }: { label: string; status?: EmailStatus }) {
  const styles: Record<string, string> = {
    pending: "bg-warning-soft text-warning",
    queued: "bg-warning-soft text-warning",
    sent: "bg-brand-soft text-brand",
    failed: "bg-danger-soft text-danger",
    default: "bg-warning-soft text-warning",
  };

  return (
    <span
      className={clsx(
        "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs",
        styles[status ?? "default"]
      )}
    >
      <ClockGlyph />
      {label}
    </span>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-paper-border">
      <path
        d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
