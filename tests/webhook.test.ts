// tests/webhook.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { Request } from "express";
import { verifySignature } from "../src/webhook/verify-signature.js";
import { insertIfAbsent } from "../src/store/jobs.js";

function fakeRequest(body: string, signature?: string): Request {
  return {
    headers: signature ? { "x-chatwoot-signature": signature } : {},
    rawBody: Buffer.from(body),
  } as unknown as Request;
}

test("verifySignature accepts when no secret configured", () => {
  const req = fakeRequest("{}");
  assert.equal(verifySignature(req, null), true);
});

test("verifySignature rejects missing signature header", () => {
  const req = fakeRequest("{}");
  assert.equal(verifySignature(req, "secret123"), false);
});

test("verifySignature accepts valid HMAC signature", () => {
  const secret = "secret123";
  const body = JSON.stringify({ event: "message_created" });
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const req = fakeRequest(body, signature);
  assert.equal(verifySignature(req, secret), true);
});

test("verifySignature rejects invalid HMAC signature", () => {
  const req = fakeRequest("{}", "deadbeef");
  assert.equal(verifySignature(req, "secret123"), false);
});

test("verifySignature rejects tampered body", () => {
  const secret = "secret123";
  const original = JSON.stringify({ event: "message_created" });
  const signature = crypto.createHmac("sha256", secret).update(original).digest("hex");

  const tamperedReq = fakeRequest(JSON.stringify({ event: "tampered" }), signature);
  assert.equal(verifySignature(tamperedReq, secret), false);
});

test("insertIfAbsent is idempotent per event_id", () => {
  const eventId = `test-event-${Date.now()}`;
  const params = {
    eventId,
    accountId: "1",
    conversationId: "100",
    messageId: "200",
    payload: { content: "/draft-email" },
  };

  const first = insertIfAbsent(params);
  const second = insertIfAbsent(params);

  assert.equal(first, true);
  assert.equal(second, false);
});
