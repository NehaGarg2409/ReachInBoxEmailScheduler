import { redis } from "../redis/client";
import { env } from "../config/env";

/**
 * Hourly, per-sender rate limiting backed by Redis INCR/DECR counters.
 *
 * Why not rely solely on BullMQ's built-in limiter?
 * BullMQ's limiter is great for *spacing* jobs (min delay between sends —
 * see the `group` rate limiter on the queue), but it can only delay/retry
 * within its own window; it has no concept of "push this to the next
 * clock-hour and keep going." The hourly cap needs that explicit
 * reschedule-to-next-window behavior, so we implement it ourselves with
 * atomic Redis operations that are safe across multiple worker processes.
 *
 * Key shape: ratelimit:{senderId}:{YYYY-MM-DDTHH}
 */

function hourBucketKey(senderId: string, date: Date): string {
  const iso = date.toISOString(); // e.g. 2026-08-30T14:22:10.000Z
  const hourBucket = iso.slice(0, 13); // 2026-08-30T14
  return `ratelimit:${senderId}:${hourBucket}`;
}

function slackNotifiedKey(senderId: string, date: Date): string {
  const iso = date.toISOString();
  const hourBucket = iso.slice(0, 13);
  return `slack-notified:${senderId}:${hourBucket}`;
}

export interface RateLimitResult {
  allowed: boolean;
  /** If not allowed, when the next hour window opens (ms since epoch). */
  nextWindowAt?: number;
  /** True only for the FIRST job that breaches the limit in this hour — used to dedupe Slack alerts. */
  isFirstBreachThisHour?: boolean;
}

export async function tryConsumeRateLimit(
  senderId: string,
  limitPerHour: number = env.scheduler.maxEmailsPerHourPerSender
): Promise<RateLimitResult> {
  const now = new Date();
  const key = hourBucketKey(senderId, now);

  // Atomically increment; set expiry only on first creation of the key.
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 2 * 60 * 60); // 2hr TTL, generous safety margin
  }

  if (count <= limitPerHour) {
    return { allowed: true };
  }

  // Over the limit: give back the slot we didn't actually use.
  await redis.decr(key);

  // Compute start of next hour window.
  const nextHour = new Date(now);
  nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);

  // Dedupe Slack notification: only the first breach in a given hour fires it.
  const notifiedKey = slackNotifiedKey(senderId, now);
  const firstBreach = await redis.set(notifiedKey, "1", "EX", 60 * 60, "NX");

  return {
    allowed: false,
    nextWindowAt: nextHour.getTime(),
    isFirstBreachThisHour: firstBreach === "OK",
  };
}
