import assert from "node:assert/strict";
import test from "node:test";
import { createDama, playDama, type DamaCell, type DamaState } from "./rules.ts";

test("white starts with twelve men on each side", () => {
  const start = createDama();
  assert.equal(start.turn, "white");
  assert.equal(start.board.filter((cell) => cell === "white").length, 12);
  assert.equal(start.board.filter((cell) => cell === "black").length, 12);
  const forward = playDama(start, "white", 40, 33);
  assert.equal(forward.ok, true);
  if (forward.ok) {
    assert.equal(forward.state.board[33], "white");
    assert.equal(forward.state.board[40], null);
    assert.equal(forward.state.turn, "black");
  }
});

test("a man cannot step backward", () => {
  const state = position([[33, "white"], [56, "black"]]);
  assert.deepEqual(playDama(state, "white", 33, 42), { ok: false, reason: "invalid-move" });
});

test("a capture is mandatory and the same piece must continue", () => {
  const state = position([
    [33, "white"],
    [40, "white"],
    [26, "black"],
    [12, "black"],
    [56, "black"],
  ]);
  assert.deepEqual(playDama(state, "white", 33, 24), { ok: false, reason: "must-capture" });
  const first = playDama(state, "white", 33, 19);
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  assert.equal(first.state.board[26], null);
  assert.equal(first.state.board[19], "white");
  assert.equal(first.state.mustFrom, 19);
  assert.equal(first.state.turn, "white");
  assert.deepEqual(playDama(first.state, "white", 40, 33), {
    ok: false,
    reason: "must-continue",
  });
  const second = playDama(first.state, "white", 19, 5);
  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }
  assert.equal(second.state.board[12], null);
  assert.equal(second.state.board[5], "white-king");
  assert.equal(second.state.turn, "black");
});

test("reaching the last row promotes and ends the turn", () => {
  const state = position([
    [8, "white"],
    [56, "black"],
  ]);
  const crowned = playDama(state, "white", 8, 1);
  assert.equal(crowned.ok, true);
  if (!crowned.ok) {
    return;
  }
  assert.equal(crowned.state.board[1], "white-king");
  assert.equal(crowned.state.turn, "black");
  assert.equal(crowned.state.mustFrom, null);
});

test("a player who cannot move loses", () => {
  const state = position([[1, "white-king"]]);
  const win = playDama(state, "white", 1, 8);
  assert.equal(win.ok, true);
  if (win.ok) {
    assert.equal(win.state.status, "won");
    assert.equal(win.state.winner, "white");
  }
});

function position(pieces: Array<[number, DamaCell]>): DamaState {
  const board: DamaCell[] = Array.from({ length: 64 }, () => null);
  for (const [index, piece] of pieces) {
    board[index] = piece;
  }
  return { board, turn: "white", mustFrom: null, status: "playing", winner: null };
}
