import assert from "node:assert/strict";
import test from "node:test";
import { createNim, playNim } from "./rules.ts";

test("taking the last stones wins", () => {
  const state = { ...createNim(), piles: [1, 0, 0] as [number, number, number] };
  const result = playNim(state, "A", 0, 1);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.state.winner, "A");
  assert.equal(result.state.status, "won");
});

test("a take larger than the pile is rejected", () => {
  const result = playNim(createNim(), "A", 0, 3);
  assert.equal(result.ok, true);
  const tooMany = playNim(createNim(), "A", 0, 4);
  assert.deepEqual(tooMany, { ok: false, reason: "invalid-take" });
});
