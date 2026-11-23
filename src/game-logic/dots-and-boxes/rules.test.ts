import assert from "node:assert/strict";
import test from "node:test";
import { createDots, playDots } from "./rules.ts";

test("closing a box keeps the turn", () => {
  const start = createDots();
  start.horizontal[0] = true;
  start.horizontal[3] = true;
  start.vertical[1] = true;
  const result = playDots(start, "A", "v0");
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.state.boxes[0], "A");
  assert.equal(result.state.turn, "A");
});

test("an open line passes the turn", () => {
  const result = playDots(createDots(), "A", "h0");
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.state.turn, "B");
});
