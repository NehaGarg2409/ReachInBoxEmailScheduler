import axios from "axios";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export function getSlackAuthorizeUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: env.slack.clientId,
    scope: "incoming-webhook",
    redirect_uri: env.slack.redirectUri,
    // Pass the userId through `state` so the callback knows who to attach the
    // connection to (Slack OAuth itself has no notion of our app's users).
    state: userId,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string, userId: string) {
  const { data } = await axios.post(
    "https://slack.com/api/oauth.v2.access",
    new URLSearchParams({
      client_id: env.slack.clientId,
      client_secret: env.slack.clientSecret,
      code,
      redirect_uri: env.slack.redirectUri,
    })
  );

  if (!data.ok) {
    throw new Error(`Slack OAuth exchange failed: ${data.error}`);
  }

  const webhookUrl: string = data.incoming_webhook.url;
  const teamId: string = data.team.id;
  const teamName: string | undefined = data.team.name;
  const accessToken: string = data.access_token;

  await prisma.slackConnection.upsert({
    where: { userId },
    create: { userId, teamId, teamName, accessToken, webhookUrl },
    update: { teamId, teamName, accessToken, webhookUrl },
  });
}

/**
 * Sends a live Slack message the moment an hourly rate limit is hit.
 * No-ops silently (does not throw) if the user hasn't connected Slack,
 * per the requirement that missing Slack config must never crash the worker.
 * Looked up fresh on every call, so connecting Slack mid-session starts
 * working immediately without a redeploy.
 */
export async function notifyRateLimitHit(params: {
  userId: string;
  senderName: string;
  limitPerHour: number;
  nextWindowAt: number;
}) {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId: params.userId },
  });

  if (!connection) {
    return; // not connected — silently skip, per spec
  }

  const resumeTime = new Date(params.nextWindowAt).toLocaleTimeString();

  try {
    await axios.post(connection.webhookUrl, {
      text:
        `:rotating_light: *Rate limit reached* for sender *${params.senderName}*\n` +
        `Hit the cap of ${params.limitPerHour} emails/hour. ` +
        `Remaining emails are queued and will resume at *${resumeTime}*.`,
    });
  } catch (err) {
    // Never let a Slack delivery failure affect the email pipeline.
    console.error("[slack] failed to deliver notification:", (err as Error).message);
  }
}
