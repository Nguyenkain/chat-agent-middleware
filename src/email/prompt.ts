// src/email/prompt.ts
import type { ChatwootMessage, ChatwootConversation } from "../clients/chatwoot.js";

const MAX_MESSAGES = 50;

/** Format conversation history for Dify context */
function formatMessages(messages: ChatwootMessage[]): string {
  const recent = messages.slice(-MAX_MESSAGES);

  if (recent.length < messages.length) {
    const omitted = messages.length - recent.length;
    return (
      `[${omitted} older messages omitted. Use only supplied context.]\n\n` +
      recent.map(formatMessage).join("\n\n")
    );
  }

  return recent.map(formatMessage).join("\n\n");
}

function formatMessage(m: ChatwootMessage): string {
  const role = m.message_type === 0 ? "Customer" : "Agent";
  const ts = new Date(m.created_at * 1000).toISOString().slice(0, 16).replace("T", " ");
  return `[${role}] ${ts}\n${m.content}`;
}

export interface PromptInputs {
  conversationContext: string;
  customerName: string;
  customerEmail: string;
  draftRequest: string;
}

/** Extract the text after "/draft-email" as the agent's draft request */
export function extractDraftRequest(content: string): string {
  return content.replace(/^\/draft-email\s*/i, "").trim();
}

export function buildPromptInputs(
  conv: ChatwootConversation,
  rawCommand: string
): PromptInputs {
  const customerName = conv.contact?.name ?? "";
  const customerEmail = conv.contact?.email ?? "";
  const draftRequest = extractDraftRequest(rawCommand);
  const conversationContext = formatMessages(conv.messages);

  return { conversationContext, customerName, customerEmail, draftRequest };
}
