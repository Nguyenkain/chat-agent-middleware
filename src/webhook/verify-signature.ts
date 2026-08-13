// src/webhook/verify-signature.ts
import crypto from "node:crypto";
import type { Request } from "express";

/**
 * Verify Chatwoot HMAC-SHA256 webhook signature.
 * Returns true if secret not configured (dev mode).
 */
export function verifySignature(req: Request, secret: string | null): boolean {
  if (!secret) return true;

  const signature = req.headers["x-chatwoot-signature"] as string | undefined;
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update((req as Request & { rawBody?: Buffer }).rawBody ?? "")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
