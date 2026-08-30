import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { enqueueEmailJob } from "./queue/emailQueue";
import { ensureEmailIndex } from "./services/elasticsearch";
import { mountBullBoard } from "./bullboard";
import { googleAuthRouter } from "./routes/auth.google";
import { slackAuthRouter } from "./routes/auth.slack";
import { emailsRouter } from "./routes/emails";

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(
  cookieSession({
    name: "reachinbox_session",
    secret: env.sessionSecret,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  })
);

app.use("/admin/queues", mountBullBoard());

app.use(googleAuthRouter);
app.use(slackAuthRouter);
app.use(emailsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * Restart-safety reconciliation pass.
 *
 * Jobs already sitting in Redis (delayed or waiting) survive a server
 * restart automatically via BullMQ + Redis AOF persistence — nothing to do
 * for those. This pass only handles the narrow gap where an Email row was
 * committed to Postgres but the process crashed *before* the corresponding
 * BullMQ job was ever added (e.g. crash between the DB write and the
 * enqueue call in emails.ts). Because enqueueEmailJob uses the email's id
 * as the BullMQ jobId, re-adding an already-queued job is a safe no-op —
 * so this is safe to run on every boot without causing duplicates.
 */
async function reconcileUnqueuedEmails() {
  const stuck = await prisma.email.findMany({
    where: { status: { in: ["pending", "queued"] } },
  });

  for (const email of stuck) {
    await enqueueEmailJob({
      emailId: email.id,
      senderId: email.senderId,
      scheduledAt: email.scheduledAt,
    });
  }

  if (stuck.length > 0) {
    console.log(`[startup] reconciled ${stuck.length} email(s) into the queue`);
  }
}

async function main() {
  await ensureEmailIndex();
  await reconcileUnqueuedEmails();

  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] Bull Board at http://localhost:${env.port}/admin/queues`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
