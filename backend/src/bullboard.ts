import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queue/emailQueue";

/**
 * Mounts a live, real-time BullMQ queue dashboard at /admin/queues.
 * Satisfies the "expose a live BullMQ dashboard for real-time queue
 * visibility" requirement — shows waiting/active/delayed/completed/failed
 * jobs as they move through the queue.
 */
export function mountBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
