import { Queue } from "bullmq";
import { redis } from "../redis/client";

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    // We handle our own status/retry semantics via Postgres, but keep BullMQ's
    // retry as a safety net for transient SMTP failures.
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 }, // keep 1hr of history for Bull Board visibility
    removeOnFail: false, // keep failed jobs visible for debugging
  },
});

export interface EmailJobData {
  emailId: string;
  senderId: string;
}

/**
 * Enqueue (or safely re-enqueue) a single email send.
 *
 * jobId = emailId, which is the core idempotency guarantee: BullMQ treats
 * add() with an existing jobId as a no-op, so calling this twice for the
 * same email (e.g. during the startup reconciliation pass) never creates
 * a duplicate job.
 */
export async function enqueueEmailJob(params: {
  emailId: string;
  senderId: string;
  scheduledAt: Date;
}) {
  const delay = Math.max(0, params.scheduledAt.getTime() - Date.now());

  return emailQueue.add(
    "send-email",
    { emailId: params.emailId, senderId: params.senderId } satisfies EmailJobData,
    {
      jobId: params.emailId,
      delay,
      // Grouped rate limiter: BullMQ enforces "max 1 job per `duration` ms
      // per groupKey" — this is our "minimum delay between sends" requirement,
      // applied independently per sender so senders don't throttle each other.
      group: { id: params.senderId },
    }
  );
}
