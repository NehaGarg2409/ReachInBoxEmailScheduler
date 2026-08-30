"use client";

import { useState } from "react";
import { useSentEmails } from "../../hooks/useSentEmails";
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

export function SentList() {
  const { emails, isLoading } = useSentEmails();
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
        title="No sends yet"
        subtitle="Once the queue starts processing scheduled emails, delivered and failed sends will land here."
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
          timeLabel={email.sentAt ? timeLabel(email.sentAt) : "—"}
          status={email.status}
          onClick={() => setSelected(email)}
        />
      ))}
    </div>
  );
}
