// src/email/normalize.ts

const SIGNATURE = "Ostenex Support";

/**
 * Strip any existing Ostenex Support signature variant, then append exactly once.
 * Throws if body is empty after stripping.
 */
export function enforceSignature(body: string): string {
  const stripped = body.replace(/\s*Ostenex\s+Support\s*$/i, "").trim();

  if (!stripped) {
    throw new Error("Email body is empty after stripping signature");
  }

  return `${stripped}\n\n${SIGNATURE}`;
}

/** Validate Dify output has non-empty subject and body */
export function validateDraft(subject: string, body: string): void {
  if (!subject?.trim()) throw new Error("Email subject is empty");
  if (!body?.trim()) throw new Error("Email body is empty");
}
