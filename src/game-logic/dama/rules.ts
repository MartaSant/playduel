export type DamaColor = "white" | "black";
export type DamaPiece = "white" | "black" | "white-king" | "black-king";
export type DamaCell = DamaPiece | null;

export type DamaState = {
  board: DamaCell[];
  turn: DamaColor;
  mustFrom: number | null;
  status: "playing" | "won";
  winner: DamaColor | null;
};

export type DamaRejection =
  | "finished"
  | "out-of-turn"
  | "invalid-square"
  | "empty-from"
  | "not-your-piece"
  | "occupied"
  | "must-capture"
  | "must-continue"
  | "invalid-move";

const DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

export function createDama(): DamaState {
  const board: DamaCell[] = Array.from({ length: 64 }, () => null);
  for (let index = 0; index < 64; index += 1) {
    if (!isDark(index)) {
      continue;
    }
    const row = rowOf(index);
    if (row <= 2) {
      board[index] = "black";
    } else if (row >= 5) {
      board[index] = "white";
    }
  }
  return { board, turn: "white", mustFrom: null, status: "playing", winner: null };
}

export function damaTargets(state: DamaState, from: number): number[] {
  if (state.status !== "playing") {
    return [];
  }
  const targets: number[] = [];
  for (let to = 0; to < 64; to += 1) {
    if (playDama(state, state.turn, from, to).ok) {
      targets.push(to);
    }
  }
  return targets;
}

export function playDama(
  state: DamaState,
  player: DamaColor,
  from: number,
  to: number,
): { ok: true; state: DamaState } | { ok: false; reason: DamaRejection } {
  if (state.status !== "playing") {
    return { ok: false, reason: "finished" };
  }
  if (player !== state.turn) {
    return { ok: false, reason: "out-of-turn" };
  }
  if (!isSquare(from) || !isSquare(to) || !isDark(from) || !isDark(to)) {
    return { ok: false, reason: "invalid-square" };
  }
  const piece = state.board[from];
  if (!piece) {
    return { ok: false, reason: "empty-from" };
  }
  if (owner(piece) !== player) {
    return { ok: false, reason: "not-your-piece" };
  }
  if (state.mustFrom !== null && from !== state.mustFrom) {
    return { ok: false, reason: "must-continue" };
  }
  if (state.board[to] !== null) {
    return { ok: false, reason: "occupied" };
  }

  const jumped = jumpOver(state.board, from, to);
  const quiet = isQuiet(piece, from, to);
  const forced = state.mustFrom !== null || sideCanCapture(state.board, player);
  if (forced && jumped === null) {
    return { ok: false, reason: state.mustFrom !== null ? "must-continue" : "must-capture" };
  }
  if (!forced && !quiet) {
    return { ok: false, reason: "invalid-move" };
  }

  const board = state.board.slice();
  board[from] = null;
  if (jumped !== null) {
    board[jumped] = null;
  }
  const promoted = !isKing(piece) && promotionRow(player) === rowOf(to);
  board[to] = promoted ? kingOf(player) : piece;

  if (jumped !== null && !promoted && jumpsFrom(board, to).length > 0) {
    return {
      ok: true,
      state: { board, turn: player, mustFrom: to, status: "playing", winner: null },
    };
  }

  const next = opposite(player);
  if (!sideCanMove(board, next)) {
    return {
      ok: true,
      state: { board, turn: next, mustFrom: null, status: "won", winner: player },
    };
  }
  return {
    ok: true,
    state: { board, turn: next, mustFrom: null, status: "playing", winner: null },
  };
}

function isSquare(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= 63;
}

function rowOf(index: number): number {
  return Math.floor(index / 8);
}

function colOf(index: number): number {
  return index % 8;
}

function isDark(index: number): boolean {
  return isSquare(index) && (rowOf(index) + colOf(index)) % 2 === 1;
}

function owner(piece: DamaPiece): DamaColor {
  return piece === "white" || piece === "white-king" ? "white" : "black";
}

function isKing(piece: DamaPiece): boolean {
  return piece === "white-king" || piece === "black-king";
}

function kingOf(color: DamaColor): DamaPiece {
  return color === "white" ? "white-king" : "black-king";
}

function opposite(color: DamaColor): DamaColor {
  return color === "white" ? "black" : "white";
}

function promotionRow(color: DamaColor): number {
  return color === "white" ? 0 : 7;
}

function isQuiet(piece: DamaPiece, from: number, to: number): boolean {
  const rowDelta = rowOf(to) - rowOf(from);
  const colDelta = colOf(to) - colOf(from);
  if (Math.abs(rowDelta) !== 1 || Math.abs(colDelta) !== 1) {
    return false;
  }
  if (isKing(piece)) {
    return true;
  }
  return piece === "white" ? rowDelta === -1 : rowDelta === 1;
}

function jumpOver(board: readonly DamaCell[], from: number, to: number): number | null {
  const rowDelta = rowOf(to) - rowOf(from);
  const colDelta = colOf(to) - colOf(from);
  if (Math.abs(rowDelta) !== 2 || Math.abs(colDelta) !== 2) {
    return null;
  }
  const piece = board[from];
  if (!piece || board[to] !== null) {
    return null;
  }
  const mid = (rowOf(from) + rowOf(to)) / 2 * 8 + (colOf(from) + colOf(to)) / 2;
  const jumped = board[mid];
  if (!jumped || owner(jumped) === owner(piece)) {
    return null;
  }
  return mid;
}

function jumpsFrom(board: readonly DamaCell[], from: number): number[] {
  const landings: number[] = [];
  for (const [rowDelta, colDelta] of DIRECTIONS) {
    const row = rowOf(from) + rowDelta * 2;
    const col = colOf(from) + colDelta * 2;
    if (row < 0 || row > 7 || col < 0 || col > 7) {
      continue;
    }
    const to = row * 8 + col;
    if (jumpOver(board, from, to) !== null) {
      landings.push(to);
    }
  }
  return landings;
}

function sideCanCapture(board: readonly DamaCell[], color: DamaColor): boolean {
  return board.some((piece, index) => piece !== null && owner(piece) === color && jumpsFrom(board, index).length > 0);
}

function sideCanMove(board: readonly DamaCell[], color: DamaColor): boolean {
  if (sideCanCapture(board, color)) {
    return true;
  }
  return board.some((piece, from) => {
    if (!piece || owner(piece) !== color) {
      return false;
    }
    return DIRECTIONS.some(([rowDelta, colDelta]) => {
      const row = rowOf(from) + rowDelta;
      const col = colOf(from) + colDelta;
      if (row < 0 || row > 7 || col < 0 || col > 7) {
        return false;
      }
      const to = row * 8 + col;
      return board[to] === null && isQuiet(piece, from, to);
    });
  });
}
