// src/config.ts
// Validates required env vars at startup — fail fast rather than at request time

function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  chatwoot: {
    baseUrl: require("CHATWOOT_BASE_URL").replace(/\/$/, ""),
    apiToken: require("CHATWOOT_API_TOKEN"),
    accountId: require("CHATWOOT_ACCOUNT_ID"),
    webhookSecret: process.env.CHATWOOT_WEBHOOK_SECRET ?? null,
  },
  dify: {
    baseUrl: (process.env.DIFY_BASE_URL || "https://api.dify.ai/v1").replace(/\/$/, ""),
    apiKey: require("DIFY_API_KEY"),
    appType: (process.env.DIFY_APP_TYPE || "chatflow") as "chatflow" | "workflow",
  },
  worker: {
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || "5000", 10),
    maxAttempts: parseInt(process.env.JOB_MAX_ATTEMPTS || "3", 10),
  },
};
