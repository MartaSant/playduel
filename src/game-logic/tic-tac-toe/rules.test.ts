import assert from "node:assert/strict";
import test from "node:test";
import { createTicTacToe, playTicTacToe, type TicTacToeState } from "./rules.ts";

function playLine(cells: readonly number[]): TicTacToeState {
  let state = createTicTacToe();
  for (const cell of cells) {
    const result = playTicTacToe(state, state.turn, cell);
    assert.equal(result.ok, true);
    if (result.ok) {
      state = result.state;
    }
  }
  return state;
}

test("X starts and players alternate", () => {
  const start = createTicTacToe();
  assert.equal(start.turn, "X");
  const first = playTicTacToe(start, "X", 0);
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.state.turn, "O");
    assert.equal(first.state.board[0], "X");
  }
});

test("wins on a row, a column and both diagonals", () => {
  const row = playLine([0, 3, 1, 4, 2]);
  assert.equal(row.status, "won");
  assert.equal(row.winner, "X");
  assert.deepEqual(row.winningLine, [0, 1, 2]);

  const column = playLine([0, 1, 3, 2, 6]);
  assert.equal(column.winner, "X");
  assert.deepEqual(column.winningLine, [0, 3, 6]);

  const diagonal = playLine([0, 1, 4, 2, 8]);
  assert.equal(diagonal.winner, "X");
  assert.deepEqual(diagonal.winningLine, [0, 4, 8]);

  const otherDiagonal = playLine([2, 0, 4, 1, 6]);
  assert.equal(otherDiagonal.winner, "X");
  assert.deepEqual(otherDiagonal.winningLine, [2, 4, 6]);
});

test("a full board without three in a line is a draw", () => {
  const state = playLine([0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(state.status, "draw");
  assert.equal(state.winner, null);
  assert.equal(state.winningLine, null);
});

test("rejects occupied cells, the wrong turn, finished games and bad indexes", () => {
  const start = createTicTacToe();
  const first = playTicTacToe(start, "X", 0);
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }

  assert.equal(playTicTacToe(first.state, "X", 1).ok, false);
  assert.deepEqual(playTicTacToe(first.state, "X", 1), {
    ok: false,
    reason: "out-of-turn",
  });
  assert.deepEqual(playTicTacToe(first.state, "O", 0), {
    ok: false,
    reason: "occupied",
  });
  assert.deepEqual(playTicTacToe(start, "X", -1), {
    ok: false,
    reason: "invalid-cell",
  });
  assert.deepEqual(playTicTacToe(start, "X", 1.5), {
    ok: false,
    reason: "invalid-cell",
  });

  const won = playLine([0, 3, 1, 4, 2]);
  assert.deepEqual(playTicTacToe(won, "O", 8), {
    ok: false,
    reason: "finished",
  });
  assert.deepEqual(start.board, createTicTacToe().board);
  assert.equal(first.state.board[0], "X");
});
