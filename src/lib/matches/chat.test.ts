import assert from "node:assert/strict";
import test from "node:test";
import { parseChatMessage, parseChatResult } from "./chat.ts";

const message = {
  id: "11111111-1111-4111-8111-111111111111",
  body: "Ciao",
  nickname: "Ada",
  isYou: true,
};

test("a chat payload keeps only short text from the two players", () => {
  assert.deepEqual(parseChatResult({ ok: true, messages: [message] }), {
    ok: true,
    messages: [message],
  });
  assert.deepEqual(parseChatResult({ ok: false, reason: "forbidden" }), {
    ok: false,
    reason: "forbidden",
  });
  assert.equal(parseChatResult({ ok: true, messages: [{ ...message, body: "x".repeat(201) }] }).ok, false);
  assert.equal(parseChatResult({ ok: true, messages: "ciao" }).ok, false);
  assert.equal(parseChatMessage("  ciao   Ada  ").ok, true);
  assert.equal(parseChatMessage("   ").ok, false);
  assert.equal(parseChatMessage("a".repeat(201)).ok, false);
});
