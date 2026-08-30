"use client";

import { useState } from "react";
import { useScheduledEmails } from "../../hooks/useScheduledEmails";
import { ListRow } from "./ListRow";
import { EmailDetail } from "./EmailDetail";
import { EmptyState } from "../ui/Table";
import type { EmailRow } from "../../lib/types";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  return `${weekday} ${time}`;
}

function toLabel(email: EmailRow) {
  return `To: ${email.recipientEmail.split("@")[0]}`;
}

export function ScheduledList() {
  const { emails, isLoading } = useScheduledEmails();
  const [selected, setSelected] = useState<EmailRow | null>(null);

  if (selected) {
    return <EmailDetail email={selected} onBack={() => setSelected(null)} />;
  }

  if (isLoading) {
    return <div className="animate-pulse px-4 py-6 text-sm text-muted">Loading...</div>;
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title="Nothing scheduled yet"
        subtitle="Compose a new email and attach a list of leads — they'll show up here the moment they're queued."
      />
    );
  }

  return (
    <div>
      {emails.map((email) => (
        <ListRow
          key={email.id}
          toLabel={toLabel(email)}
          subject={email.subject}
          preview={email.body.replace(/<[^>]+>/g, "").slice(0, 80)}
          timeLabel={timeLabel(email.scheduledAt)}
          status={email.status}
          onClick={() => setSelected(email)}
        />
      ))}
    </div>
  );
}
