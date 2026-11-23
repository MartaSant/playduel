import assert from "node:assert/strict";
import test from "node:test";
import { parseMatchResult } from "./rules.ts";

const matchId = "1b09202c-6ded-45b4-bd94-4a06f38cfaca";

test("a waiting search is not a match", () => {
  assert.deepEqual(
    parseMatchResult({ ok: true, access: "waiting", gameSlug: "tris" }),
    { ok: true, access: "waiting", gameSlug: "tris" },
  );
});

test("a tris snapshot keeps only a real board", () => {
  const parsed = parseMatchResult({
    ok: true,
    matchId,
    gameSlug: "tris",
    status: "playing",
    result: "playing",
    version: 1,
    deadlineAt: "2026-11-23T17:00:00+00:00",
    yourSeat: "X",
    winnerSeat: null,
    successorId: null,
    roomCode: null,
    youRequested: false,
    opponentRequested: false,
    players: [{ nickname: "Ada", seat: "X", isYou: true }],
    state: {
      board: [null, null, null, null, null, null, null, null, null],
      turn: "X",
      status: "playing",
      winner: null,
      winningLine: null,
    },
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok && "state" in parsed && "board" in parsed.state) {
    assert.equal(parsed.state.board.length, 9);
  }
});

test("a hidden opponent hand stays hidden", () => {
  const parsed = parseMatchResult({
    ok: true,
    matchId,
    gameSlug: "morra-cinese",
    status: "playing",
    result: "playing",
    version: 2,
    deadlineAt: null,
    yourSeat: "A",
    winnerSeat: null,
    successorId: null,
    roomCode: "AB23EFGH",
    youRequested: false,
    opponentRequested: true,
    players: [],
    state: {
      scores: { A: 0, B: 0 },
      roundsPlayed: 0,
      choices: { A: "rock", B: null },
      status: "choosing",
      winner: null,
      lastRound: null,
    },
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok && "state" in parsed && "choices" in parsed.state) {
    assert.equal(parsed.state.choices.B, null);
    assert.equal(parsed.state.choices.A, "rock");
  }
});

test("an unknown move detail does not invent a reason", () => {
  assert.deepEqual(parseMatchResult({ ok: false, reason: "invalid_move", detail: "cheat" }), {
    ok: false,
    reason: "invalid_move",
  });
});
