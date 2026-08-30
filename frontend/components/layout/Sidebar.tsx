"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import type { CurrentUser } from "../../lib/types";

type Tab = "scheduled" | "sent";

export function Sidebar({
  user,
  tab,
  onTabChange,
  onCompose,
  onLogout,
  scheduledCount,
  sentCount,
}: {
  user: CurrentUser;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onCompose: () => void;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-paper-border bg-white px-4 py-5">
      <div className="mb-6 px-1">
        <span className="font-display text-xl font-bold tracking-tight text-ink">ONB</span>
      </div>

      <div className="relative mb-4">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-paper"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-display text-sm text-white">
              {user.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-paper-border bg-white p-1 shadow-lg">
            {!user.slackConnected ? (
              <button
                onClick={() => (window.location.href = api.connectSlackUrl())}
                className="block w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-paper"
              >
                Connect Slack
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-success">Slack connected ✓</div>
            )}
            <button
              onClick={onLogout}
              className="block w-full rounded px-3 py-2 text-left text-sm text-danger hover:bg-paper"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onCompose}
        className="mb-6 w-full rounded-full border border-brand py-2 text-sm font-medium text-brand transition hover:bg-brand-soft"
      >
        Compose
      </button>

      <p className="mb-2 px-2 text-xs font-semibold tracking-widest text-muted">CORE</p>

      <nav className="flex flex-col gap-1">
        <NavItem
          label="Scheduled"
          count={scheduledCount}
          active={tab === "scheduled"}
          onClick={() => onTabChange("scheduled")}
          icon={<ClockIcon />}
        />
        <NavItem
          label="Sent"
          count={sentCount}
          active={tab === "sent"}
          onClick={() => onTabChange("sent")}
          icon={<SendIcon />}
        />
      </nav>
    </aside>
  );
}

function NavItem({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-brand-soft font-medium text-brand" : "text-ink hover:bg-paper"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={active ? "text-brand" : "text-muted"}>{count}</span>
    </button>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
