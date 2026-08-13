// src/store/jobs.ts
import { withStore, readStoreSnapshot, type JobRecord } from "./db.js";
import { config } from "../config.js";

export type JobStatus = JobRecord["status"];
export type Job = JobRecord;

export interface InsertJobParams {
  eventId: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  payload: object;
}

/** Insert if event_id not seen before. Returns true if inserted. */
export function insertIfAbsent(params: InsertJobParams): boolean {
  return withStore((store) => {
    const exists = store.jobs.some((j) => j.event_id === params.eventId);
    if (exists) return false;

    const now = Math.floor(Date.now() / 1000);
    const job: JobRecord = {
      id: store.nextId++,
      event_id: params.eventId,
      type: "draft_email",
      account_id: params.accountId,
      conversation_id: params.conversationId,
      message_id: params.messageId,
      payload: JSON.stringify(params.payload),
      status: "pending",
      attempts: 0,
      last_error: null,
      result_note_id: null,
      available_at: now,
      created_at: now,
      updated_at: now,
    };
    store.jobs.push(job);
    return true;
  });
}

/** Claim one pending job for processing. Returns null if none available. */
export function claimNext(): Job | null {
  return withStore((store) => {
    const now = Math.floor(Date.now() / 1000);
    const job = store.jobs
      .filter((j) => j.status === "pending" && j.available_at <= now)
      .sort((a, b) => a.available_at - b.available_at)[0];

    if (!job) return null;

    job.status = "processing";
    job.attempts += 1;
    job.updated_at = now;

    return { ...job };
  });
}

export function markCompleted(id: number, resultNoteId: string): void {
  withStore((store) => {
    const job = store.jobs.find((j) => j.id === id);
    if (!job) return;
    job.status = "completed";
    job.result_note_id = resultNoteId;
    job.last_error = null;
    job.updated_at = Math.floor(Date.now() / 1000);
  });
}

export function markFailed(id: number, error: string): void {
  withStore((store) => {
    const job = store.jobs.find((j) => j.id === id);
    if (!job) return;

    const now = Math.floor(Date.now() / 1000);

    if (job.attempts >= config.worker.maxAttempts) {
      job.status = "failed";
      job.last_error = error;
      job.updated_at = now;
    } else {
      // Exponential backoff: 5s, 15s, 45s
      const backoff = 5 * Math.pow(3, job.attempts - 1);
      job.status = "pending";
      job.last_error = error;
      job.available_at = now + backoff;
      job.updated_at = now;
    }
  });
}

/** Reset jobs stuck in processing for >10 minutes */
export function resetStuckJobs(): void {
  withStore((store) => {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - 600;
    for (const job of store.jobs) {
      if (job.status === "processing" && job.updated_at < cutoff) {
        job.status = "pending";
        job.available_at = now;
        job.updated_at = now;
      }
    }
  });
}

export function getAllJobs(): Job[] {
  return readStoreSnapshot().jobs;
}
