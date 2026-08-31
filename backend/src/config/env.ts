import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  sessionSecret: required("SESSION_SECRET", "dev-secret"),
  frontendUrl: required("FRONTEND_URL", "http://localhost:3001"),
  backendUrl: required("BACKEND_URL", "http://localhost:4000"),

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  elasticsearchUrl: required("ELASTICSEARCH_URL", "http://localhost:9200"),

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: required("GOOGLE_CALLBACK_URL", "http://localhost:4000/auth/google/callback"),
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID ?? "",
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
    redirectUri: required("SLACK_REDIRECT_URI", "http://localhost:4000/auth/slack/callback"),
  },

  ethereal: {
    user: process.env.ETHEREAL_SMTP_USER ?? "",
    pass: process.env.ETHEREAL_SMTP_PASS ?? "",
  },

  scheduler: {
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
    minDelayMsBetweenSends: Number(process.env.MIN_DELAY_MS_BETWEEN_SENDS ?? 2000),
    maxEmailsPerHourPerSender: Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 200),
  },
};
