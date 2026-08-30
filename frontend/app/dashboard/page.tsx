"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import type { CurrentUser } from "../../lib/types";
import { Sidebar } from "../../components/layout/Sidebar";
import { ComposePanel } from "../../components/compose/ComposePanel";
import { ScheduledList } from "../../components/tables/ScheduledList";
import { SentList } from "../../components/tables/SentList";
import { useScheduledEmails } from "../../hooks/useScheduledEmails";
import { useSentEmails } from "../../hooks/useSentEmails";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [composeOpen, setComposeOpen] = useState(false);

  const { total: scheduledCount, refresh: refreshScheduled } = useScheduledEmails();
  const { total: sentCount } = useSentEmails();

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => router.replace("/"))
      .finally(() => setLoadingUser(false));
  }, [router]);

  if (loadingUser) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        user={user}
        tab={tab}
        onTabChange={setTab}
        onCompose={() => setComposeOpen(true)}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        onLogout={async () => {
          await api.logout();
          router.replace("/");
        }}
      />

      <main className="flex-1 overflow-y-auto">
        {tab === "scheduled" ? <ScheduledList /> : <SentList />}
      </main>

      <ComposePanel
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={() => {
          setTab("scheduled");
          refreshScheduled();
        }}
      />
    </div>
  );
}
