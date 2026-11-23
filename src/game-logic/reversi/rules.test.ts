import assert from "node:assert/strict";
import test from "node:test";
import { createReversi, playReversi } from "./rules.ts";

test("the opening black move flips a white disc", () => {
  const start = createReversi();
  const result = playReversi(start, "black", 19);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.state.board[19], "black");
  assert.equal(result.state.board[27], "black");
  assert.equal(result.state.turn, "white");
});

test("a cell that flips nothing is rejected", () => {
  const result = playReversi(createReversi(), "black", 0);
  assert.deepEqual(result, { ok: false, reason: "no-flip" });
});
