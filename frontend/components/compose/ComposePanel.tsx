"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { RecipientChips } from "./RecipientChips";
import { RichTextEditor } from "./RichTextEditor";
import { SendLaterPopover } from "./SendLaterPopover";
import { api } from "../../lib/api";

function formatScheduleLabel(date: Date, isNow: boolean) {
  if (isNow) return "Send immediately";
  return `Scheduled for ${date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComposePanel({
  open,
  onClose,
  onScheduled,
}: {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const { data: sendersData } = useSWR(open ? "senders" : null, api.senders);
  const senders = sendersData?.items ?? [];

  const [senderId, setSenderId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  // Files/images attached to this batch — sent as real email attachments on
  // every recipient's copy. Kept separate from the CSV "leads" upload, which
  // only ever supplies recipient addresses, never attachment content.
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schedule time is surfaced directly in the panel. `startTime === null`
  // means "send immediately" (resolved to `new Date()` at submit time); once
  // the user picks a time via Send Later, it's shown here and used instead.
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sendLaterOpen, setSendLaterOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (senders.length && !senderId) setSenderId(senders[0].id);
  }, [senders, senderId]);

  if (!open) return null;

  function handleAttachFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setAttachments((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(when: Date) {
    setError(null);

    if (!senderId || !subject || !body || recipients.length === 0) {
      setError("Add a sender, subject, body, and at least one recipient.");
      return;
    }

    const formData = new FormData();
    formData.append("senderId", senderId);
    formData.append("subject", subject);
    formData.append("body", body);
    formData.append("startTime", when.toISOString());
    formData.append("delayMs", String(delayMs));
    formData.append("hourlyLimit", String(hourlyLimit));
    formData.append("recipients", JSON.stringify(recipients));
    // Same field name repeated — backend's multer `.fields()` config collects
    // these into an array under `attachments`.
    attachments.forEach((file) => formData.append("attachments", file));

    try {
      setSubmitting(true);
      await api.scheduleEmail(formData);
      onScheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-paper-border px-6 py-4">
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close compose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="flex-1 font-display text-base font-semibold text-ink">Compose New Email</h2>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach files or images"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
          >
            <PaperclipIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            className="hidden"
            onChange={(e) => {
              handleAttachFiles(e.target.files);
              e.target.value = ""; // allow re-selecting the same file later
            }}
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FieldRow label="From">
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full border-none bg-transparent py-1.5 text-sm text-ink focus:outline-none"
            >
              {senders.length === 0 && <option value="">No senders yet</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.smtpUser}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="To">
            <RecipientChips recipients={recipients} onChange={setRecipients} />
          </FieldRow>

          <FieldRow label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border-none bg-transparent py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </FieldRow>

          {/* Visible schedule-time row — reachable without opening the popover blind. */}
          <FieldRow label="When">
            <div className="relative flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-sm text-ink">
                <ClockIcon />
                {formatScheduleLabel(startTime ?? new Date(), startTime === null)}
              </span>

              <button
                onClick={() => setSendLaterOpen((v) => !v)}
                className="text-xs font-medium text-brand hover:underline"
              >
                {startTime ? "Change time" : "Schedule for later"}
              </button>

              <SendLaterPopover
                open={sendLaterOpen}
                onClose={() => setSendLaterOpen(false)}
                onConfirm={(date) => {
                  setStartTime(date);
                  setSendLaterOpen(false);
                }}
              />
            </div>
          </FieldRow>

          <div className="flex items-center gap-6 py-1">
            <label className="flex items-center gap-2 text-xs text-muted">
              Delay between 2 emails
              <input
                type="number"
                min={0}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-16 rounded border border-paper-border px-2 py-1 text-xs text-ink"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted">
              Hourly Limit
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-16 rounded border border-paper-border px-2 py-1 text-xs text-ink"
              />
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1">
              {attachments.map((file, i) => (
                <AttachmentChip key={i} file={file} onRemove={() => removeAttachment(i)} />
              ))}
            </div>
          )}

          <RichTextEditor content={body} onChange={setBody} />

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-paper-border px-6 py-4">
          <span className="text-xs text-muted">
            {startTime ? formatScheduleLabel(startTime, false) : "Will send immediately unless scheduled above"}
          </span>

          <div className="flex overflow-hidden rounded-full border border-brand">
            <button
              onClick={() => submit(startTime ?? new Date())}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-50"
            >
              {submitting ? "Sending..." : startTime ? "Schedule" : "Send"}
            </button>
            <button
              onClick={() => setSendLaterOpen((v) => !v)}
              disabled={submitting}
              className="border-l border-brand px-3 py-2 text-brand hover:bg-brand-soft disabled:opacity-50"
              aria-label="Send later options"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-2 rounded border border-paper-border bg-paper px-2 py-1.5 pr-1">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-7 w-7 rounded object-cover" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded bg-white text-muted">
          <FileIcon />
        </div>
      )}
      <div className="leading-tight">
        <p className="max-w-[140px] truncate text-xs font-medium text-ink">{file.name}</p>
        <p className="text-[10px] text-muted">{formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-white hover:text-danger"
      >
        ✕
      </button>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-paper-border py-1">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.19 9.19a1.5 1.5 0 1 1-2.12-2.12l8.49-8.49"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
