// tests/prompt.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { extractDraftRequest, buildPromptInputs } from "../src/email/prompt.js";
import type { ChatwootConversation } from "../src/clients/chatwoot.js";

test("extractDraftRequest strips command prefix", () => {
  assert.equal(
    extractDraftRequest("/email Please apologize for the delay"),
    "Please apologize for the delay"
  );
});

test("extractDraftRequest handles bare command", () => {
  assert.equal(extractDraftRequest("/email"), "");
});

test("extractDraftRequest is case-insensitive", () => {
  assert.equal(extractDraftRequest("/Email hello"), "hello");
});

test("buildPromptInputs fills customer fields from contact", () => {
  const conv: ChatwootConversation = {
    contact: { name: "John Smith", email: "john@example.com" },
    messages: [
      {
        id: 1,
        content: "I received the wrong item.",
        message_type: 0,
        private: false,
        created_at: 1710000000,
      },
    ],
  };

  const inputs = buildPromptInputs(conv, "/email confirm refund");

  assert.equal(inputs.customerName, "John Smith");
  assert.equal(inputs.customerEmail, "john@example.com");
  assert.equal(inputs.draftRequest, "confirm refund");
  assert.match(inputs.conversationContext, /Customer/);
  assert.match(inputs.conversationContext, /wrong item/);
});

test("buildPromptInputs handles missing contact gracefully", () => {
  const conv: ChatwootConversation = { contact: null, messages: [] };
  const inputs = buildPromptInputs(conv, "/email");

  assert.equal(inputs.customerName, "");
  assert.equal(inputs.customerEmail, "");
  assert.equal(inputs.conversationContext, "");
});

test("buildPromptInputs omits older messages beyond limit", () => {
  const messages = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    content: `message ${i}`,
    message_type: 0 as const,
    private: false,
    created_at: 1710000000 + i,
  }));
  const conv: ChatwootConversation = { contact: null, messages };

  const inputs = buildPromptInputs(conv, "/email");

  assert.match(inputs.conversationContext, /omitted/i);
  assert.doesNotMatch(inputs.conversationContext, /message 0\n/);
});
