import assert from "node:assert/strict";
import test from "node:test";
import {
  isConfirmed,
  parseAdminGate,
  parseAdminOverview,
  parseAdminSearch,
} from "./rules.ts";

test("only an explicit yes confirms an admin action", () => {
  assert.equal(isConfirmed("yes"), true);
  assert.equal(isConfirmed("true"), false);
  assert.equal(isConfirmed(null), false);
});

test("a password session without the second factor is not ready", () => {
  assert.deepEqual(parseAdminGate({ ok: true, stage: "mfa" }), {
    ok: true,
    stage: "mfa",
  });
  assert.deepEqual(parseAdminGate({ ok: false, reason: "forbidden" }), {
    ok: false,
    reason: "forbidden",
  });
});

test("overview counts must be numbers and sanctions keep their ids", () => {
  const parsed = parseAdminOverview({
    ok: true,
    players: 2,
    playingMatches: 0,
    openRooms: 1,
    openReports: 0,
    activeSanctions: 1,
    sanctions: [
      {
        id: "1b09202c-6ded-45b4-bd94-4a06f38cfaca",
        nickname: "Ada",
        expiresAt: "2026-11-24T00:00:00+00:00",
        reason: "prova",
      },
    ],
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.sanctions[0]?.nickname, "Ada");
  }
});

test("search refuses a payload that is not a list", () => {
  assert.deepEqual(parseAdminSearch({ ok: true, query: "ada", players: {} }), {
    ok: false,
    reason: "unavailable",
  });
});
