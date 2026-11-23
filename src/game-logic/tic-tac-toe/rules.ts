export const TIC_TAC_TOE_PLAYERS = ["X", "O"] as const;
export type TicTacToePlayer = (typeof TIC_TAC_TOE_PLAYERS)[number];
export type TicTacToeCell = TicTacToePlayer | null;
export type TicTacToeStatus = "playing" | "won" | "draw";

export type TicTacToeState = {
  board: readonly TicTacToeCell[];
  turn: TicTacToePlayer;
  status: TicTacToeStatus;
  winner: TicTacToePlayer | null;
  winningLine: readonly number[] | null;
};

export type TicTacToeRejection =
  | "invalid-cell"
  | "finished"
  | "out-of-turn"
  | "occupied";

export type TicTacToeMove =
  | { ok: true; state: TicTacToeState }
  | { ok: false; reason: TicTacToeRejection };

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function createTicTacToe(): TicTacToeState {
  return {
    board: Array.from({ length: 9 }, () => null),
    turn: "X",
    status: "playing",
    winner: null,
    winningLine: null,
  };
}

export function playTicTacToe(
  state: TicTacToeState,
  player: TicTacToePlayer,
  cell: number,
): TicTacToeMove {
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
    return { ok: false, reason: "invalid-cell" };
  }
  if (state.status !== "playing") {
    return { ok: false, reason: "finished" };
  }
  if (player !== state.turn) {
    return { ok: false, reason: "out-of-turn" };
  }
  if (state.board[cell] !== null) {
    return { ok: false, reason: "occupied" };
  }

  const board = state.board.slice();
  board[cell] = player;
  const winningLine = LINES.find((line) =>
    line.every((index) => board[index] === player),
  );

  if (winningLine) {
    return {
      ok: true,
      state: {
        board,
        turn: player,
        status: "won",
        winner: player,
        winningLine,
      },
    };
  }

  if (board.every((value) => value !== null)) {
    return {
      ok: true,
      state: {
        board,
        turn: player,
        status: "draw",
        winner: null,
        winningLine: null,
      },
    };
  }

  return {
    ok: true,
    state: {
      board,
      turn: player === "X" ? "O" : "X",
      status: "playing",
      winner: null,
      winningLine: null,
    },
  };
}
