import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

export const esClient = new Client({ node: env.elasticsearchUrl });

export const EMAIL_INDEX = "emails";

export async function ensureEmailIndex() {
  const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          recipientEmail: { type: "keyword" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          senderId: { type: "keyword" },
          senderName: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
        },
      },
    });
    console.log(`[elasticsearch] created index "${EMAIL_INDEX}"`);
  }
}

/**
 * Dual-write on every status transition (pending -> queued -> sent/failed).
 * Postgres remains the source of truth; if this indexing call fails we log
 * and move on rather than failing the send — search staleness is an
 * acceptable, documented trade-off vs. a full CDC pipeline for this scope.
 */
export async function indexEmail(email: {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  senderId: string;
  senderName?: string;
  scheduledAt: Date;
  sentAt?: Date | null;
}) {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: email.id,
      document: {
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        senderId: email.senderId,
        senderName: email.senderName,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt ?? null,
      },
    });
  } catch (err) {
    console.error("[elasticsearch] indexing failed:", (err as Error).message);
  }
}

export async function searchEmails(query: string, userSenderIds: string[]) {
  const result = await esClient.search({
    index: EMAIL_INDEX,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ["recipientEmail", "subject", "body"],
            },
          },
        ],
        filter: [{ terms: { senderId: userSenderIds } }],
      },
    },
    size: 50,
  });

  return result.hits.hits.map((hit) => hit._source);
}
