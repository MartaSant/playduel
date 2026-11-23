export const CONNECT_FOUR_COLUMNS = 7;
export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_PLAYERS = ["red", "yellow"] as const;
export type ConnectFourPlayer = (typeof CONNECT_FOUR_PLAYERS)[number];
export type ConnectFourCell = ConnectFourPlayer | null;
export type ConnectFourStatus = "playing" | "won" | "draw";

export type ConnectFourPoint = {
  column: number;
  row: number;
};

export type ConnectFourState = {
  columns: readonly (readonly ConnectFourCell[])[];
  turn: ConnectFourPlayer;
  status: ConnectFourStatus;
  winner: ConnectFourPlayer | null;
  winningCells: readonly ConnectFourPoint[] | null;
};

export type ConnectFourRejection =
  | "invalid-column"
  | "finished"
  | "out-of-turn"
  | "column-full";

export type ConnectFourMove =
  | { ok: true; state: ConnectFourState }
  | { ok: false; reason: ConnectFourRejection };

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

export function createConnectFour(): ConnectFourState {
  return {
    columns: Array.from({ length: CONNECT_FOUR_COLUMNS }, () =>
      Array.from({ length: CONNECT_FOUR_ROWS }, () => null),
    ),
    turn: "red",
    status: "playing",
    winner: null,
    winningCells: null,
  };
}

export function dropDisc(
  state: ConnectFourState,
  player: ConnectFourPlayer,
  column: number,
): ConnectFourMove {
  if (
    !Number.isInteger(column) ||
    column < 0 ||
    column >= CONNECT_FOUR_COLUMNS
  ) {
    return { ok: false, reason: "invalid-column" };
  }
  if (state.status !== "playing") {
    return { ok: false, reason: "finished" };
  }
  if (player !== state.turn) {
    return { ok: false, reason: "out-of-turn" };
  }

  const row = state.columns[column].findIndex((cell) => cell === null);
  if (row === -1) {
    return { ok: false, reason: "column-full" };
  }

  const columns = state.columns.map((cells, index) => {
    if (index !== column) {
      return cells;
    }
    const next = cells.slice();
    next[row] = player;
    return next;
  });
  const winningCells = findWinningCells(columns, column, row, player);
  if (winningCells) {
    return {
      ok: true,
      state: {
        columns,
        turn: player,
        status: "won",
        winner: player,
        winningCells,
      },
    };
  }

  const full = columns.every((cells) => cells.every((cell) => cell !== null));
  if (full) {
    return {
      ok: true,
      state: {
        columns,
        turn: player,
        status: "draw",
        winner: null,
        winningCells: null,
      },
    };
  }

  return {
    ok: true,
    state: {
      columns,
      turn: player === "red" ? "yellow" : "red",
      status: "playing",
      winner: null,
      winningCells: null,
    },
  };
}

function findWinningCells(
  columns: readonly (readonly ConnectFourCell[])[],
  column: number,
  row: number,
  player: ConnectFourPlayer,
): ConnectFourPoint[] | null {
  for (const [columnStep, rowStep] of DIRECTIONS) {
    const cells: ConnectFourPoint[] = [{ column, row }];
    for (const sign of [1, -1]) {
      let nextColumn = column + columnStep * sign;
      let nextRow = row + rowStep * sign;
      while (
        nextColumn >= 0 &&
        nextColumn < CONNECT_FOUR_COLUMNS &&
        nextRow >= 0 &&
        nextRow < CONNECT_FOUR_ROWS &&
        columns[nextColumn]?.[nextRow] === player
      ) {
        cells.push({ column: nextColumn, row: nextRow });
        nextColumn += columnStep * sign;
        nextRow += rowStep * sign;
      }
    }
    if (cells.length >= 4) {
      return cells;
    }
  }
  return null;
}
