// src/store/db.ts
// File-based JSON store — avoids native compilation (better-sqlite3 requires a
// C++20 toolchain that isn't guaranteed on every deploy target). Fine for MVP
// volume; migrate to PostgreSQL in Phase 2 if running multiple worker instances.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { dirname } from "path";

const DATA_DIR = "./data";
const DB_PATH = `${DATA_DIR}/jobs.json`;

mkdirSync(DATA_DIR, { recursive: true });

export interface JobRecord {
  id: number;
  event_id: string;
  type: string;
  account_id: string;
  conversation_id: string;
  message_id: string;
  payload: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  last_error: string | null;
  result_note_id: string | null;
  available_at: number;
  created_at: number;
  updated_at: number;
}

interface StoreShape {
  nextId: number;
  jobs: JobRecord[];
}

function readStore(): StoreShape {
  if (!existsSync(DB_PATH)) {
    return { nextId: 1, jobs: [] };
  }
  const raw = readFileSync(DB_PATH, "utf-8");
  if (!raw.trim()) return { nextId: 1, jobs: [] };
  return JSON.parse(raw) as StoreShape;
}

function writeStore(store: StoreShape): void {
  // Write to temp file then rename — avoids truncated file if process dies mid-write
  const tmpPath = `${DB_PATH}.tmp`;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(tmpPath, JSON.stringify(store, null, 2));
  renameSync(tmpPath, DB_PATH);
}

/**
 * All store mutations run through this synchronous critical section.
 * Node's single-threaded event loop plus sync fs calls make this safe
 * without an explicit lock, as long as callers don't await mid-mutation.
 */
export function withStore<T>(fn: (store: StoreShape) => T): T {
  const store = readStore();
  const result = fn(store);
  writeStore(store);
  return result;
}

export function readStoreSnapshot(): StoreShape {
  return readStore();
}
