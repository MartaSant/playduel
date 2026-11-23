export type ReversiPlayer = "black" | "white";
export type ReversiCell = ReversiPlayer | null;
export type ReversiStatus = "playing" | "won" | "draw";
export type ReversiRejection = "invalid-cell" | "finished" | "out-of-turn" | "no-flip";

export type ReversiState = {
  board: ReversiCell[];
  turn: ReversiPlayer;
  status: ReversiStatus;
  winner: ReversiPlayer | null;
};

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export function oppositeReversi(player: ReversiPlayer): ReversiPlayer {
  return player === "black" ? "white" : "black";
}

function cellIndex(row: number, column: number): number {
  return row * 8 + column;
}

export function reversiFlips(
  board: readonly ReversiCell[],
  player: ReversiPlayer,
  cell: number,
): number[] {
  if (cell < 0 || cell > 63 || board[cell] !== null) {
    return [];
  }
  const row = Math.floor(cell / 8);
  const column = cell % 8;
  const opponent = oppositeReversi(player);
  const flipped: number[] = [];
  for (const [deltaRow, deltaColumn] of DIRECTIONS) {
    const line: number[] = [];
    let nextRow = row + deltaRow;
    let nextColumn = column + deltaColumn;
    while (
      nextRow >= 0 &&
      nextRow < 8 &&
      nextColumn >= 0 &&
      nextColumn < 8 &&
      board[cellIndex(nextRow, nextColumn)] === opponent
    ) {
      line.push(cellIndex(nextRow, nextColumn));
      nextRow += deltaRow;
      nextColumn += deltaColumn;
    }
    const closed =
      nextRow >= 0 &&
      nextRow < 8 &&
      nextColumn >= 0 &&
      nextColumn < 8 &&
      board[cellIndex(nextRow, nextColumn)] === player;
    if (line.length > 0 && closed) {
      flipped.push(...line);
    }
  }
  return flipped;
}

export function reversiCanMove(board: readonly ReversiCell[], player: ReversiPlayer): boolean {
  return board.some((_, index) => reversiFlips(board, player, index).length > 0);
}

export function createReversi(): ReversiState {
  const board: ReversiCell[] = Array.from({ length: 64 }, () => null);
  board[27] = "white";
  board[28] = "black";
  board[35] = "black";
  board[36] = "white";
  return { board, turn: "black", status: "playing", winner: null };
}

function finished(board: ReversiCell[], turn: ReversiPlayer): ReversiState {
  const black = board.filter((cell) => cell === "black").length;
  const white = board.filter((cell) => cell === "white").length;
  if (black === white) {
    return { board, turn, status: "draw", winner: null };
  }
  return {
    board,
    turn,
    status: "won",
    winner: black > white ? "black" : "white",
  };
}

export function playReversi(
  state: ReversiState,
  player: ReversiPlayer,
  cell: number,
): { ok: true; state: ReversiState } | { ok: false; reason: ReversiRejection } {
  if (state.status !== "playing") {
    return { ok: false, reason: "finished" };
  }
  if (player !== state.turn) {
    return { ok: false, reason: "out-of-turn" };
  }
  if (!Number.isInteger(cell) || cell < 0 || cell > 63) {
    return { ok: false, reason: "invalid-cell" };
  }
  const flipped = reversiFlips(state.board, player, cell);
  if (flipped.length === 0) {
    return { ok: false, reason: "no-flip" };
  }
  const board = state.board.slice();
  board[cell] = player;
  for (const index of flipped) {
    board[index] = player;
  }
  const opponent = oppositeReversi(player);
  if (reversiCanMove(board, opponent)) {
    return { ok: true, state: { board, turn: opponent, status: "playing", winner: null } };
  }
  if (reversiCanMove(board, player)) {
    return { ok: true, state: { board, turn: player, status: "playing", winner: null } };
  }
  return { ok: true, state: finished(board, opponent) };
}
