// tests/normalize.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { enforceSignature, validateDraft } from "../src/email/normalize.js";

test("appends signature when missing", () => {
  const result = enforceSignature("Dear customer, thank you.");
  assert.equal(result, "Dear customer, thank you.\n\nOstenex Support");
});

test("does not duplicate signature", () => {
  const result = enforceSignature("Thanks.\n\nOstenex Support");
  const count = (result.match(/Ostenex Support/gi) ?? []).length;
  assert.equal(count, 1);
});

test("replaces case-insensitive signature variant", () => {
  const result = enforceSignature("Thanks.\nostenex support");
  assert.ok(result.endsWith("Ostenex Support"));
  assert.equal((result.match(/Ostenex Support/gi) ?? []).length, 1);
});

test("throws on empty body", () => {
  assert.throws(() => enforceSignature(""), /empty/i);
});

test("throws when body is only whitespace", () => {
  assert.throws(() => enforceSignature("   "), /empty/i);
});

test("throws when body is only signature", () => {
  assert.throws(() => enforceSignature("Ostenex Support"), /empty/i);
});

test("validateDraft throws on empty subject", () => {
  assert.throws(() => validateDraft("", "body"), /subject/i);
});

test("validateDraft throws on empty body", () => {
  assert.throws(() => validateDraft("subject", ""), /body/i);
});
