import { Router } from "express";
import multer from "multer";
import Papa from "papaparse";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { enqueueEmailJob } from "../queue/emailQueue";
import { indexEmail, searchEmails } from "../services/elasticsearch";
import { env } from "../config/env";

export const emailsRouter = Router();

// Attachments are stored on local disk, keyed by batch id, and referenced by
// path in EmailBatch.attachments (see schema.prisma). This is a deliberately
// simple choice for this scope — a production system would use S3 or
// equivalent object storage instead of the local filesystem.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "attachments");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
});

interface AttachmentMeta {
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}

const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  startTime: z.string().datetime(),
  delayMs: z.coerce.number().int().min(0).default(env.scheduler.minDelayMsBetweenSends),
  hourlyLimit: z.coerce.number().int().min(1).default(env.scheduler.maxEmailsPerHourPerSender),
  recipients: z.array(z.string().email()).min(1),
});

/**
 * POST /api/emails/schedule
 * multipart/form-data with fields: senderId, subject, body, startTime, delayMs,
 * hourlyLimit, an optional `leads` file (CSV/text of emails), and zero or more
 * `attachments` files (images/documents to include in every send in this batch).
 *
 * Creates one EmailBatch + N Email rows (one per recipient) and enqueues N
 * BullMQ delayed jobs, staggered by `delayMs` starting at `startTime`.
 */
emailsRouter.post(
  "/api/emails/schedule",
  requireAuth,
  upload.fields([
    { name: "leads", maxCount: 1 },
    { name: "attachments", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as
        | { leads?: Express.Multer.File[]; attachments?: Express.Multer.File[] }
        | undefined;

      let recipients: string[] = [];

      const leadsFile = files?.leads?.[0];
      if (leadsFile) {
        const text = leadsFile.buffer.toString("utf-8");
        const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
        recipients = parsed.data
          .flat()
          .map((cell) => String(cell).trim())
          .filter((cell) => /\S+@\S+\.\S+/.test(cell));
      } else if (req.body.recipients) {
        recipients = JSON.parse(req.body.recipients);
      }

      const parsed = scheduleSchema.parse({ ...req.body, recipients });

      const sender = await prisma.sender.findFirst({
        where: { id: parsed.senderId, userId: req.session.userId },
      });
      if (!sender) return res.status(404).json({ error: "Sender not found" });

      const startTime = new Date(parsed.startTime);

      const batch = await prisma.emailBatch.create({
        data: {
          userId: req.session.userId!,
          senderId: sender.id,
          subject: parsed.subject,
          body: parsed.body,
          startTime,
          delayMs: parsed.delayMs,
          hourlyLimit: parsed.hourlyLimit,
          totalRecipients: parsed.recipients.length,
        },
      });

      // Persist any attached files to disk under this batch's own folder, then
      // record their paths on the batch row so the worker can find them again
      // at send time — including after a process restart, since nothing here
      // depends on the in-memory multer buffer surviving.
      const attachmentFiles = files?.attachments ?? [];
      if (attachmentFiles.length > 0) {
        const batchDir = path.join(UPLOAD_DIR, batch.id);
        fs.mkdirSync(batchDir, { recursive: true });

        const attachmentMeta: AttachmentMeta[] = attachmentFiles.map((file) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
          const destPath = path.join(batchDir, safeName);
          fs.writeFileSync(destPath, file.buffer);
          return {
            filename: file.originalname,
            path: destPath,
            mimetype: file.mimetype,
            size: file.size,
          };
        });

        await prisma.emailBatch.update({
          where: { id: batch.id },
          data: { attachments: attachmentMeta as unknown as object },
        });
      }

      // Stagger scheduledAt per-recipient by delayMs, starting at startTime.
      // This is the initial schedule; the worker's grouped limiter and hourly
      // rate-limiter both still apply on top of this at send time.
      const emails = await Promise.all(
        parsed.recipients.map((recipientEmail, i) =>
          prisma.email.create({
            data: {
              batchId: batch.id,
              senderId: sender.id,
              recipientEmail,
              subject: parsed.subject,
              body: parsed.body,
              status: "pending",
              scheduledAt: new Date(startTime.getTime() + i * parsed.delayMs),
            },
          })
        )
      );

      // Enqueue jobs + mark queued. Done after DB commit so a crash here is
      // recovered by the startup reconciliation pass (see index.ts), not lost.
      for (const email of emails) {
        await enqueueEmailJob({
          emailId: email.id,
          senderId: sender.id,
          scheduledAt: email.scheduledAt,
        });
        await prisma.email.update({ where: { id: email.id }, data: { status: "queued" } });
        await indexEmail({
          id: email.id,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          status: "queued",
          senderId: email.senderId,
          senderName: sender.displayName,
          scheduledAt: email.scheduledAt,
        });
      }

      res.status(201).json({ batchId: batch.id, scheduled: emails.length });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }
      console.error("[emails.schedule] failed:", (err as Error).message);
      res.status(500).json({ error: "Failed to schedule emails" });
    }
  }
);

emailsRouter.get("/api/emails/scheduled", requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = 20;

  const [items, total] = await Promise.all([
    prisma.email.findMany({
      where: { status: { in: ["pending", "queued"] }, batch: { userId: req.session.userId } },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: true },
    }),
    prisma.email.count({
      where: { status: { in: ["pending", "queued"] }, batch: { userId: req.session.userId } },
    }),
  ]);

  res.json({ items, total, page, pageSize });
});

emailsRouter.get("/api/emails/sent", requireAuth, async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = 20;

  const [items, total] = await Promise.all([
    prisma.email.findMany({
      where: { status: { in: ["sent", "failed"] }, batch: { userId: req.session.userId } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: true },
    }),
    prisma.email.count({
      where: { status: { in: ["sent", "failed"] }, batch: { userId: req.session.userId } },
    }),
  ]);

  res.json({ items, total, page, pageSize });
});

emailsRouter.get("/api/emails/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ items: [] });

  const senders = await prisma.sender.findMany({
    where: { userId: req.session.userId },
    select: { id: true },
  });

  const items = await searchEmails(q, senders.map((s) => s.id));
  res.json({ items });
});

emailsRouter.get("/api/senders", requireAuth, async (req, res) => {
  const senders = await prisma.sender.findMany({ where: { userId: req.session.userId } });
  res.json({ items: senders });
});

const createSenderSchema = z.object({
  displayName: z.string().min(1),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  smtpHost: z.string().default("smtp.ethereal.email"),
  smtpPort: z.coerce.number().default(587),
});

emailsRouter.post("/api/senders", requireAuth, async (req, res) => {
  try {
    const data = createSenderSchema.parse(req.body);
    const sender = await prisma.sender.create({
      data: { ...data, userId: req.session.userId! },
    });
    res.status(201).json(sender);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    res.status(500).json({ error: "Failed to create sender" });
  }
});
