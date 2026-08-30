"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function RecipientChips({
  recipients,
  onChange,
}: {
  recipients: string[];
  onChange: (emails: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function commitDraft() {
    const email = draft.trim().replace(/,$/, "");
    if (email && EMAIL_RE.test(email) && !recipients.includes(email)) {
      onChange([...recipients, email]);
    }
    setDraft("");
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
      const emails = parsed.data
        .flat()
        .map((c) => String(c).trim())
        .filter((c) => EMAIL_RE.test(c));
      const merged = Array.from(new Set([...recipients, ...emails]));
      onChange(merged);
    };
    reader.readAsText(file);
  }

  const extraCount = recipients.length > 3 ? recipients.length - 3 : 0;
  const visible = recipients.slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs text-brand"
        >
          {email}
          <button
            onClick={() => onChange(recipients.filter((e) => e !== email))}
            className="text-brand/70 hover:text-brand"
            aria-label={`Remove ${email}`}
          >
            ✕
          </button>
        </span>
      ))}

      {extraCount > 0 && (
        <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">+{extraCount}</span>
      )}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitDraft();
          }
        }}
        onBlur={commitDraft}
        placeholder={recipients.length === 0 ? "recipient@example.com" : ""}
        className="min-w-[140px] flex-1 border-none bg-transparent py-1 text-sm text-ink placeholder:text-muted focus:outline-none"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        <UploadIcon />
        Upload List
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 16V4M12 4 7 9M12 4l5 5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
