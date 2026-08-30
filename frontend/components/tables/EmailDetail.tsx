import type { EmailRow } from "../../lib/types";

export function EmailDetail({ email, onBack }: { email: EmailRow; onBack: () => void }) {
  const dateLabel = email.sentAt ?? email.scheduledAt;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-paper-border px-6 py-4">
        <button onClick={onBack} className="text-muted hover:text-ink" aria-label="Back to list">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="font-display text-base font-semibold text-ink">{email.subject}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-display text-sm text-white">
              {email.sender.displayName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                {email.sender.displayName}{" "}
                <span className="font-normal text-muted">&lt;{email.sender.smtpUser}&gt;</span>
              </p>
              <p className="text-xs text-muted">to {email.recipientEmail}</p>
            </div>
          </div>
          <span className="whitespace-nowrap text-xs text-muted">
            {new Date(dateLabel).toLocaleString()}
          </span>
        </div>

        <div
          className="prose prose-sm max-w-none text-sm leading-relaxed text-ink"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {email.status === "failed" && email.errorMessage && (
          <div className="mt-6 rounded border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            Delivery failed: {email.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
