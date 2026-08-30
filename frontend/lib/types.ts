export type EmailStatus = "pending" | "queued" | "sent" | "failed";

export interface Sender {
  id: string;
  displayName: string;
  smtpUser: string;
  smtpHost: string;
  smtpPort: number;
}

export interface EmailRow {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  errorMessage: string | null;
  sender: Sender;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  slackConnected: boolean;
}

export interface ScheduleEmailPayload {
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  recipients: string[];
}
