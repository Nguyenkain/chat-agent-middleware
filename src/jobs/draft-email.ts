// src/jobs/draft-email.ts
import type { Job } from "../store/jobs.js";
import { getConversationMessages, createPrivateNote } from "../clients/chatwoot.js";
import { createEmailDraft } from "../clients/dify.js";
import { buildPromptInputs } from "../email/prompt.js";
import { enforceSignature, validateDraft } from "../email/normalize.js";

export async function processDraftEmailJob(job: Job): Promise<string> {
  const payload = JSON.parse(job.payload) as { content?: string };
  const rawCommand = String(payload.content ?? "");

  const conversation = await getConversationMessages(
    job.account_id,
    job.conversation_id
  );

  const inputs = buildPromptInputs(conversation, rawCommand);

  const draft = await createEmailDraft(inputs);
  validateDraft(draft.subject, draft.body);

  const body = enforceSignature(draft.body);

  const note = [
    "AI draft — review before sending",
    "",
    `Subject: ${draft.subject}`,
    "",
    body,
  ].join("\n");

  const created = await createPrivateNote(
    job.account_id,
    job.conversation_id,
    note
  );

  return created.id;
}
