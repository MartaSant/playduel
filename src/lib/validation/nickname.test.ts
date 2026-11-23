import assert from "node:assert/strict";
import test from "node:test";
import { parseNickname, playerWrite } from "./nickname.ts";

test("accepts a trimmed nickname and collapses spaces", () => {
  assert.deepEqual(parseNickname("  Ada   Lovelace  "), {
    ok: true,
    nickname: "Ada Lovelace",
  });
});

test("rejects empty, short, long and disallowed characters", () => {
  assert.equal(reason("   "), "empty");
  assert.equal(reason("Al"), "length");
  assert.equal(reason("A".repeat(21)), "length");
  assert.equal(reason("Ada!"), "characters");
  assert.equal(reason("Ada_Lovelace"), "characters");
});

function reason(input: string) {
  const parsed = parseNickname(input);
  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return "accepted";
  }
  return parsed.reason;
}

test("rejects an obvious blocked nickname without claiming the list is complete", () => {
  const blocked = parseNickname("merda");
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.reason, "blocked");
  }
  assert.equal(parseNickname("Marco").ok, true);
});

test("a profile write always uses the session id", () => {
  const write = playerWrite("session-user", "  Ada  ");
  assert.deepEqual(write, {
    ok: true,
    id: "session-user",
    nickname: "Ada",
  });
  assert.equal(playerWrite("session-user", "x").ok, false);
});
