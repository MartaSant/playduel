import assert from "node:assert/strict";
import test from "node:test";
import {
  createConnectFour,
  dropDisc,
  type ConnectFourState,
} from "./rules.ts";

function playLine(columns: readonly number[]): ConnectFourState {
  let state = createConnectFour();
  for (const column of columns) {
    const result = dropDisc(state, state.turn, column);
    assert.equal(result.ok, true, `column ${column}`);
    if (result.ok) {
      state = result.state;
    }
  }
  return state;
}

test("a disc falls to the lowest free row", () => {
  const state = playLine([0, 0, 0]);
  assert.equal(state.columns[0][0], "red");
  assert.equal(state.columns[0][1], "yellow");
  assert.equal(state.columns[0][2], "red");
  assert.equal(state.columns[0][3], null);
  assert.equal(state.turn, "yellow");
});

test("wins horizontally, vertically and on both diagonals", () => {
  const horizontal = playLine([0, 0, 1, 1, 2, 2, 3]);
  assert.equal(horizontal.status, "won");
  assert.equal(horizontal.winner, "red");
  assert.equal(horizontal.winningCells?.length, 4);

  const vertical = playLine([0, 1, 0, 1, 0, 1, 0]);
  assert.equal(vertical.winner, "red");
  assert.ok(
    vertical.winningCells?.every((cell) => cell.column === 0),
  );

  const rising = playLine([0, 1, 1, 2, 3, 2, 2, 3, 3, 6, 3]);
  assert.equal(rising.winner, "red");

  const falling = playLine([
    3, 1, 1, 6, 4, 4, 5, 1, 1, 4, 1, 2, 2, 5, 3, 2, 3, 2, 5, 6, 1, 3,
  ]);
  assert.equal(falling.winner, "yellow");
  assert.ok(
    falling.winningCells?.every(
      (cell, _, cells) =>
        cells[0] !== undefined &&
        cell.column + cell.row === cells[0].column + cells[0].row,
    ),
  );
});

test("four in a line wins when the disc also fills the column", () => {
  const state = playLine([1, 0, 1, 0, 0, 1, 0, 1, 0, 1]);
  assert.equal(state.status, "playing");
  const result = dropDisc(state, "red", 0);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.columns[0].every((cell) => cell !== null), true);
    assert.equal(result.state.status, "won");
    assert.equal(result.state.winner, "red");
  }
});

test("rejects a full column, the wrong turn, a finished match and a bad column", () => {
  const start = createConnectFour();
  const filled = playLine([0, 0, 0, 0, 0, 0]);
  assert.deepEqual(dropDisc(filled, filled.turn, 0), {
    ok: false,
    reason: "column-full",
  });
  assert.deepEqual(dropDisc(start, "yellow", 3), {
    ok: false,
    reason: "out-of-turn",
  });
  assert.deepEqual(dropDisc(start, "red", -1), {
    ok: false,
    reason: "invalid-column",
  });
  assert.deepEqual(dropDisc(start, "red", 7), {
    ok: false,
    reason: "invalid-column",
  });

  const won = playLine([0, 1, 0, 1, 0, 1, 0]);
  assert.deepEqual(dropDisc(won, "yellow", 2), {
    ok: false,
    reason: "finished",
  });
  assert.equal(start.columns[3][0], null);
});

test("a full board without four in a line is a draw", () => {
  const state = playLine([
    4, 0, 1, 6, 6, 1, 3, 1, 6, 2, 4, 4, 5, 3, 2, 0, 2, 4, 0, 0, 2, 6, 4, 0,
    4, 5, 6, 0, 5, 3, 6, 1, 1, 1, 5, 2, 3, 3, 5, 5, 2, 3,
  ]);
  assert.equal(state.status, "draw");
  assert.equal(state.winner, null);
});
