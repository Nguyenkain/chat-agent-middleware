// src/clients/dify.ts
import { config } from "../config.js";

export interface DifyDraftInput {
  conversationContext: string;
  customerName: string;
  customerEmail: string;
  draftRequest: string;
}

export interface DifyDraftResult {
  subject: string;
  body: string;
}

const difyHeaders = {
  Authorization: `Bearer ${config.dify.apiKey}`,
  "Content-Type": "application/json",
};

/** Parse JSON from Dify answer field — model may wrap in markdown fences */
function parseDifyAnswer(raw: string): DifyDraftResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Dify returned non-JSON answer: ${raw.slice(0, 200)}`);
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj["subject"] !== "string" || typeof obj["body"] !== "string") {
    throw new Error(`Dify answer missing subject/body fields: ${cleaned.slice(0, 200)}`);
  }

  return { subject: obj["subject"], body: obj["body"] };
}

export async function createEmailDraft(
  input: DifyDraftInput
): Promise<DifyDraftResult> {
  const inputs = {
    conversation_context: input.conversationContext,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    draft_request: input.draftRequest || "",
  };

  if (config.dify.appType === "workflow") {
    return callWorkflow(inputs);
  }
  return callChatflow(inputs);
}

async function callChatflow(
  inputs: Record<string, string>
): Promise<DifyDraftResult> {
  const res = await fetch(`${config.dify.baseUrl}/chat-messages`, {
    method: "POST",
    headers: difyHeaders,
    body: JSON.stringify({
      inputs,
      query:
        "Create an English customer-support email draft from the supplied context.",
      response_mode: "blocking",
      user: "chatwoot-middleware",
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dify chatflow ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { answer?: string };
  if (!data.answer) throw new Error("Dify returned empty answer");

  return parseDifyAnswer(data.answer);
}

async function callWorkflow(
  inputs: Record<string, string>
): Promise<DifyDraftResult> {
  const res = await fetch(`${config.dify.baseUrl}/workflows/run`, {
    method: "POST",
    headers: difyHeaders,
    body: JSON.stringify({
      inputs,
      response_mode: "blocking",
      user: "chatwoot-middleware",
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dify workflow ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: { outputs?: Record<string, unknown> };
  };
  const outputs = data.data?.outputs ?? {};

  // Workflow may return structured outputs directly
  if (typeof outputs["subject"] === "string" && typeof outputs["body"] === "string") {
    return { subject: outputs["subject"] as string, body: outputs["body"] as string };
  }

  // Or packed in a single text output
  const textOutput = outputs["text"] ?? outputs["answer"] ?? outputs["result"];
  if (typeof textOutput === "string") {
    return parseDifyAnswer(textOutput);
  }

  throw new Error(`Dify workflow outputs missing subject/body: ${JSON.stringify(outputs).slice(0, 300)}`);
}
