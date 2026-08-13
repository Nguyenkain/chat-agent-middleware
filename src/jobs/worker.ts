// src/jobs/worker.ts
import { config } from "../config.js";
import { claimNext, markCompleted, markFailed, resetStuckJobs } from "../store/jobs.js";
import { processDraftEmailJob } from "./draft-email.js";
import { createPrivateNote } from "../clients/chatwoot.js";

let running = false;

async function tick(): Promise<void> {
  const job = claimNext();
  if (!job) return;

  console.log(`[Worker] Processing job ${job.id} conv=${job.conversation_id}`);

  try {
    const noteId = await processDraftEmailJob(job);
    markCompleted(job.id, noteId);
    console.log(`[Worker] Job ${job.id} completed, note=${noteId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Job ${job.id} failed: ${message}`);
    markFailed(job.id, message);

    const isFinalAttempt = job.attempts >= config.worker.maxAttempts;
    if (isFinalAttempt) {
      await createPrivateNote(
        job.account_id,
        job.conversation_id,
        `⚠️ Could not generate email draft. Error: ${message}\nPlease draft manually or retry with /email`
      ).catch((e) => console.error("[Worker] Failed to post error note:", e));
    }
  }
}

export function startWorker(): void {
  if (running) return;
  running = true;

  setInterval(() => {
    resetStuckJobs();
  }, 60_000);

  const loop = async () => {
    if (!running) return;
    await tick().catch((e) => console.error("[Worker] tick error:", e));
    setTimeout(loop, config.worker.pollIntervalMs);
  };

  loop();
  console.log(`[Worker] Started, polling every ${config.worker.pollIntervalMs}ms`);
}
