// src/clients/chatwoot.ts
import { config } from "../config.js";

const headers = () => ({
  api_access_token: config.chatwoot.apiToken,
  "Content-Type": "application/json",
});

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number; // 0=incoming(customer), 1=outgoing(agent)
  private: boolean;
  created_at: number;
  sender?: { name?: string; email?: string };
}

export interface ChatwootConversation {
  contact: { name?: string; email?: string } | null;
  messages: ChatwootMessage[];
}

export async function getConversationMessages(
  accountId: string,
  conversationId: string
): Promise<ChatwootConversation> {
  const url = `${config.chatwoot.baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;

  const res = await fetch(url, {
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Chatwoot getMessages ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    payload?: ChatwootMessage[];
    meta?: { sender?: { name?: string; email?: string } };
  };

  const messages = (data.payload ?? []).filter((m) => !m.private);
  const contact = data.meta?.sender ?? null;

  return { messages, contact };
}

export async function createPrivateNote(
  accountId: string,
  conversationId: string,
  content: string
): Promise<{ id: string }> {
  const url = `${config.chatwoot.baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      content,
      message_type: "outgoing",
      private: true,
      content_type: "text",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chatwoot createNote ${res.status}: ${text}`);
  }

  const note = (await res.json()) as { id: string };
  return note;
}
