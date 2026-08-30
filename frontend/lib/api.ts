import type {
  CurrentUser,
  EmailRow,
  PaginatedResponse,
  Sender,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  me: () => request<CurrentUser>("/auth/me"),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  senders: () => request<{ items: Sender[] }>("/api/senders"),
  createSender: (data: {
    displayName: string;
    smtpUser: string;
    smtpPass: string;
    smtpHost?: string;
    smtpPort?: number;
  }) =>
    request<Sender>("/api/senders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  scheduled: (page = 1) =>
    request<PaginatedResponse<EmailRow>>(`/api/emails/scheduled?page=${page}`),
  sent: (page = 1) => request<PaginatedResponse<EmailRow>>(`/api/emails/sent?page=${page}`),
  search: (q: string) => request<{ items: EmailRow[] }>(`/api/emails/search?q=${encodeURIComponent(q)}`),

  scheduleEmail: (formData: FormData) =>
    request<{ batchId: string; scheduled: number }>("/api/emails/schedule", {
      method: "POST",
      body: formData,
    }),

  connectSlackUrl: () => `${API_BASE}/auth/slack`,
  googleLoginUrl: () => `${API_BASE}/auth/google`,
};
