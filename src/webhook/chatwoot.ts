// src/webhook/chatwoot.ts
import { Router, Request, Response } from "express";
import { config } from "../config.js";
import { verifySignature } from "./verify-signature.js";
import { insertIfAbsent } from "../store/jobs.js";

export const webhookRouter = Router();

const TRIGGER = "/draft-email";

webhookRouter.post("/chatwoot", (req: Request, res: Response) => {
  if (!verifySignature(req, config.chatwoot.webhookSecret)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // Trả 200 ngay — không block cho Dify
  res.status(200).json({ received: true });

  const event = req.body as Record<string, unknown>;

  if (event["event"] !== "message_created") return;
  if (event["private"] !== true) return;

  const content = String(event["content"] ?? "").trim();
  if (!content.toLowerCase().startsWith(TRIGGER)) return;

  const conversationId = String(
    (event["conversation"] as Record<string, unknown>)?.["id"] ?? ""
  );
  const accountId = String(
    (event["account"] as Record<string, unknown>)?.["id"] ??
      config.chatwoot.accountId
  );
  const messageId = String(event["id"] ?? "");
  const eventId = `${accountId}-${messageId}`;

  if (!conversationId || !messageId) {
    console.warn("[Webhook] Missing conversation or message id, skipping");
    return;
  }

  const inserted = insertIfAbsent({
    eventId,
    accountId,
    conversationId,
    messageId,
    payload: event,
  });

  if (inserted) {
    console.log(
      `[Webhook] Job created for conv=${conversationId} event=${eventId}`
    );
  } else {
    console.log(`[Webhook] Duplicate event ${eventId}, skipped`);
  }
});
