
import { Worker, Job } from "bullmq";
import { redis } from "../redis/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { EMAIL_QUEUE_NAME, EmailJobData, enqueueEmailJob } from "./emailQueue";
import { tryConsumeRateLimit } from "./rateLimiter";
import { notifyRateLimitHit } from "../services/slack";
import { sendEmail, MailAttachment } from "../services/mailer";
import { indexEmail } from "../services/elasticsearch";

// EmailBatch.attachments is stored as Prisma Json; this describes the shape
// written by routes/emails.ts when files are uploaded at compose time.
interface StoredAttachment {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

async function processEmailJob(job: Job<EmailJobData>) {
  const { emailId, senderId } = job.data;

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { sender: true, batch: { include: { user: true } } },
  });

  if (!email) {
    console.warn(`[worker] email ${emailId} no longer exists, skipping`);
    return;
  }

  // Idempotency guard: if a previous attempt already succeeded (e.g. the
  // process crashed after sending but before this job resolved), don't
  // send again — just make sure the job completes cleanly.
  if (email.status === "sent") {
    return;
  }

  // --- Hourly rate limit check (Redis-backed, atomic, multi-worker safe) ---
  // Uses the hourly limit configured on this email's batch (falls back to the
  // global env default if the batch somehow lacks one).
  const limitResult = await tryConsumeRateLimit(senderId, email.batch.hourlyLimit ?? undefined);
  if (!limitResult.allowed) {
    // Reschedule into the next hour window rather than failing the job.
    await enqueueEmailJob({
      emailId: email.id,
      senderId,
      scheduledAt: new Date(limitResult.nextWindowAt!),
    });

    if (limitResult.isFirstBreachThisHour) {
      await notifyRateLimitHit({
        userId: email.batch.userId,
        senderName: email.sender.displayName,
        limitPerHour: env.scheduler.maxEmailsPerHourPerSender,
        nextWindowAt: limitResult.nextWindowAt!,
      });
    }

    return; // this attempt is done; the re-enqueued job will run later
  }

  // --- Send via Ethereal SMTP ---
  try {
    const storedAttachments = (email.batch.attachments as StoredAttachment[] | null) ?? [];
    const attachments: MailAttachment[] = storedAttachments.map((a) => ({
      filename: a.filename,
      path: a.path,
      contentType: a.mimetype,
    }));

    await sendEmail({
      sender: email.sender,
      to: email.recipientEmail,
      subject: email.subject,
      html: email.body,
      attachments,
    });

    const sentAt = new Date();
    await prisma.email.update({
      where: { id: email.id },
      data: { status: "sent", sentAt },
    });

    await indexEmail({
      id: email.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      status: "sent",
      senderId: email.senderId,
      senderName: email.sender.displayName,
      scheduledAt: email.scheduledAt,
      sentAt,
    });
  } catch (err) {
    await prisma.email.update({
      where: { id: email.id },
      data: { status: "failed", errorMessage: (err as Error).message },
    });

    await indexEmail({
      id: email.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      status: "failed",
      senderId: email.senderId,
      senderName: email.sender.displayName,
      scheduledAt: email.scheduledAt,
    });

    throw err; // let BullMQ's retry/backoff handle transient SMTP errors
  }
}

export const emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redis,
  concurrency: env.scheduler.workerConcurrency,
  // Grouped rate limiter: enforces the minimum delay between sends,
  // independently per sender (see `group` on enqueueEmailJob).
  limiter: {
    max: 1,
    duration: env.scheduler.minDelayMsBetweenSends,
  },
});

emailWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

console.log(
  `[worker] listening on "${EMAIL_QUEUE_NAME}" (concurrency=${env.scheduler.workerConcurrency}, ` +
    `min delay=${env.scheduler.minDelayMsBetweenSends}ms)`
);
