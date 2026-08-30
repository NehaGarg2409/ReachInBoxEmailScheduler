import clsx from "clsx";
import type { EmailStatus } from "../../lib/types";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-paper-border bg-white">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ columns }: { columns: string[] }) {
  return (
    <thead className="border-b border-paper-border bg-paper">
      <tr>
        {columns.map((col) => (
          <th key={col} className="eyebrow px-4 py-3 font-medium">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-paper-border last:border-0 hover:bg-paper/60">{children}</tr>;
}

export function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={clsx("px-4 py-3 align-middle text-ink", mono && "font-mono text-xs")}>
      {children}
    </td>
  );
}

export function StatusPill({ status }: { status: EmailStatus }) {
  const styles: Record<EmailStatus, string> = {
    pending: "bg-warning-soft text-warning",
    queued: "bg-signal-soft text-signal",
    sent: "bg-success-soft text-success",
    failed: "bg-danger-soft text-danger",
  };

  return <span className={clsx("status-pill", styles[status])}>{status}</span>;
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted">{subtitle}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-paper-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 flex-1 animate-pulse rounded bg-paper-border/70" />
          ))}
        </div>
      ))}
    </div>
  );
}
