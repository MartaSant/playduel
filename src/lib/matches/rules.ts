import { getGame, type GameSlug } from "../games.ts";
import type { ConnectFourState } from "../../game-logic/connect-four/rules.ts";
import type { DamaState } from "../../game-logic/dama/rules.ts";
import type { DotsState } from "../../game-logic/dots-and-boxes/rules.ts";
import type { NimState } from "../../game-logic/nim/rules.ts";
import type { ReversiState } from "../../game-logic/reversi/rules.ts";
import type { RpsHand, RpsState } from "../../game-logic/rock-paper-scissors/rules.ts";
import type { TicTacToeState } from "../../game-logic/tic-tac-toe/rules.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MATCH_FAILURES = [
  "unauthenticated",
  "profile_required",
  "invalid_game",
  "invalid_code",
  "not_found",
  "forbidden",
  "not_ready",
  "invalid_move",
  "rate_limited",
  "banned",
  "missing-config",
  "unavailable",
] as const;

export type MatchFailureReason = (typeof MATCH_FAILURES)[number];

export const MOVE_DETAILS = [
  "invalid-cell",
  "occupied",
  "out-of-turn",
  "finished",
  "invalid-column",
  "column-full",
  "invalid-hand",
  "already-chosen",
  "not-choosing",
  "no-flip",
  "invalid-edge",
  "edge-taken",
  "invalid-pile",
  "invalid-take",
  "invalid-square",
  "empty-from",
  "not-your-piece",
  "must-capture",
  "must-continue",
] as const;

export type MoveDetail = (typeof MOVE_DETAILS)[number];

export type MatchFailure = {
  ok: false;
  reason: MatchFailureReason;
  detail?: MoveDetail;
};

export type MatchPlayer = {
  nickname: string;
  seat: string;
  isYou: boolean;
};

export type MatchSnapshot = {
  ok: true;
  matchId: string;
  gameSlug: GameSlug;
  status: "playing" | "finished";
  result: "playing" | "won" | "draw" | "timeout" | "abandoned";
  version: number;
  deadlineAt: string | null;
  yourSeat: string;
  winnerSeat: string | null;
  successorId: string | null;
  roomCode: string | null;
  youRequested: boolean;
  opponentRequested: boolean;
  players: MatchPlayer[];
  state: TicTacToeState | ConnectFourState | RpsState | ReversiState | DotsState | NimState | DamaState;
};

export type QueueSnapshot =
  | { ok: true; access: "idle" | "waiting"; gameSlug: GameSlug }
  | { ok: true; access: "matched"; gameSlug: GameSlug; matchId: string };

export type MatchResult = MatchSnapshot | QueueSnapshot | MatchFailure;

export function isMatchId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseMatchResult(value: unknown): MatchResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return { ok: false, reason: "unavailable" };
  }
  if (!value.ok) {
    const detail = isDetail(value.detail) ? value.detail : undefined;
    return {
      ok: false,
      reason: isFailure(value.reason) ? value.reason : "unavailable",
      ...(detail ? { detail } : {}),
    };
  }
  if (value.access === "idle" || value.access === "waiting" || value.access === "matched") {
    return parseQueue(value);
  }
  return parseSnapshot(value) ?? { ok: false, reason: "unavailable" };
}

export function nicknameForSeat(
  players: readonly MatchPlayer[],
  seat: string | null,
): string {
  if (!seat) {
    return "Nessuno";
  }
  return players.find((player) => player.seat === seat)?.nickname ?? seat;
}

function parseQueue(value: Record<string, unknown>): MatchResult {
  if (!isGameSlug(value.gameSlug)) {
    return { ok: false, reason: "unavailable" };
  }
  if (value.access === "matched") {
    if (typeof value.matchId !== "string" || !isMatchId(value.matchId)) {
      return { ok: false, reason: "unavailable" };
    }
    return {
      ok: true,
      access: "matched",
      gameSlug: value.gameSlug,
      matchId: value.matchId,
    };
  }
  if (value.access === "idle" || value.access === "waiting") {
    return { ok: true, access: value.access, gameSlug: value.gameSlug };
  }
  return { ok: false, reason: "unavailable" };
}

function parseSnapshot(value: Record<string, unknown>): MatchSnapshot | null {
  if (
    typeof value.matchId !== "string" ||
    !isMatchId(value.matchId) ||
    !isGameSlug(value.gameSlug) ||
    (value.status !== "playing" && value.status !== "finished") ||
    !isResult(value.result) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    !isOptionalString(value.deadlineAt) ||
    typeof value.yourSeat !== "string" ||
    !isOptionalString(value.winnerSeat) ||
    !isOptionalString(value.successorId) ||
    !isOptionalString(value.roomCode) ||
    typeof value.youRequested !== "boolean" ||
    typeof value.opponentRequested !== "boolean" ||
    !Array.isArray(value.players)
  ) {
    return null;
  }
  const players: MatchPlayer[] = [];
  for (const player of value.players) {
    if (
      !isRecord(player) ||
      typeof player.nickname !== "string" ||
      typeof player.seat !== "string" ||
      typeof player.isYou !== "boolean"
    ) {
      return null;
    }
    players.push({
      nickname: player.nickname,
      seat: player.seat,
      isYou: player.isYou,
    });
  }
  const state = readState(value.gameSlug, value.state);
  if (!state) {
    return null;
  }
  return {
    ok: true,
    matchId: value.matchId,
    gameSlug: value.gameSlug,
    status: value.status,
    result: value.result,
    version: value.version,
    deadlineAt: value.deadlineAt,
    yourSeat: value.yourSeat,
    winnerSeat: value.winnerSeat,
    successorId: value.successorId,
    roomCode: value.roomCode,
    youRequested: value.youRequested,
    opponentRequested: value.opponentRequested,
    players,
    state,
  };
}

function readState(
  game: GameSlug,
  value: unknown,
): TicTacToeState | ConnectFourState | RpsState | ReversiState | DotsState | NimState | DamaState | null {
  if (game === "tris") {
    return readTicTacToe(value);
  }
  if (game === "forza-4") {
    return readConnectFour(value);
  }
  if (game === "reversi") {
    return readReversi(value);
  }
  if (game === "punti-quadrati") {
    return readDots(value);
  }
  if (game === "tre-pile") {
    return readNim(value);
  }
  if (game === "dama") {
    return readDama(value);
  }
  return readRps(value);
}

function readTicTacToe(value: unknown): TicTacToeState | null {
  if (!isRecord(value) || !Array.isArray(value.board) || value.board.length !== 9) {
    return null;
  }
  const board = value.board.map((cell) =>
    cell === "X" || cell === "O" ? cell : cell === null ? null : undefined,
  );
  if (board.some((cell) => cell === undefined)) {
    return null;
  }
  if (value.turn !== "X" && value.turn !== "O") {
    return null;
  }
  if (value.status !== "playing" && value.status !== "won" && value.status !== "draw") {
    return null;
  }
  return {
    board,
    turn: value.turn,
    status: value.status,
    winner: value.winner === "X" || value.winner === "O" ? value.winner : null,
    winningLine: readNumbers(value.winningLine),
  };
}

function readConnectFour(value: unknown): ConnectFourState | null {
  if (!isRecord(value) || !Array.isArray(value.columns) || value.columns.length !== 7) {
    return null;
  }
  const columns = [];
  for (const column of value.columns) {
    if (!Array.isArray(column) || column.length !== 6) {
      return null;
    }
    const cells = column.map((cell) =>
      cell === "red" || cell === "yellow" ? cell : cell === null ? null : undefined,
    );
    if (cells.some((cell) => cell === undefined)) {
      return null;
    }
    columns.push(cells);
  }
  if (value.turn !== "red" && value.turn !== "yellow") {
    return null;
  }
  if (value.status !== "playing" && value.status !== "won" && value.status !== "draw") {
    return null;
  }
  return {
    columns,
    turn: value.turn,
    status: value.status,
    winner: value.winner === "red" || value.winner === "yellow" ? value.winner : null,
    winningCells: readPoints(value.winningCells),
  };
}

function readReversi(value: unknown): ReversiState | null {
  if (!isRecord(value) || !Array.isArray(value.board) || value.board.length !== 64) {
    return null;
  }
  const board = value.board.map((cell) =>
    cell === "black" || cell === "white" ? cell : cell === null ? null : undefined,
  );
  if (board.some((cell) => cell === undefined)) {
    return null;
  }
  if (value.turn !== "black" && value.turn !== "white") {
    return null;
  }
  if (value.status !== "playing" && value.status !== "won" && value.status !== "draw") {
    return null;
  }
  return {
    board,
    turn: value.turn,
    status: value.status,
    winner: value.winner === "black" || value.winner === "white" ? value.winner : null,
  };
}

function readDots(value: unknown): DotsState | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.horizontal) ||
    value.horizontal.length !== 12 ||
    !Array.isArray(value.vertical) ||
    value.vertical.length !== 12 ||
    !Array.isArray(value.boxes) ||
    value.boxes.length !== 9
  ) {
    return null;
  }
  if (value.horizontal.some((edge) => typeof edge !== "boolean")) {
    return null;
  }
  if (value.vertical.some((edge) => typeof edge !== "boolean")) {
    return null;
  }
  const boxes = value.boxes.map((owner) =>
    owner === "A" || owner === "B" ? owner : owner === null ? null : undefined,
  );
  if (boxes.some((owner) => owner === undefined)) {
    return null;
  }
  if (value.turn !== "A" && value.turn !== "B") {
    return null;
  }
  if (value.status !== "playing" && value.status !== "won") {
    return null;
  }
  return {
    horizontal: value.horizontal,
    vertical: value.vertical,
    boxes,
    turn: value.turn,
    status: value.status,
    winner: value.winner === "A" || value.winner === "B" ? value.winner : null,
  };
}

function readNim(value: unknown): NimState | null {
  if (!isRecord(value) || !Array.isArray(value.piles) || value.piles.length !== 3) {
    return null;
  }
  const piles = value.piles.map((count) => (typeof count === "number" ? count : null));
  if (piles.some((count) => count === null)) {
    return null;
  }
  if (value.turn !== "A" && value.turn !== "B") {
    return null;
  }
  if (value.status !== "playing" && value.status !== "won") {
    return null;
  }
  return {
    piles: [piles[0] as number, piles[1] as number, piles[2] as number],
    turn: value.turn,
    status: value.status,
    winner: value.winner === "A" || value.winner === "B" ? value.winner : null,
  };
}

function readDama(value: unknown): DamaState | null {
  if (!isRecord(value) || !Array.isArray(value.board) || value.board.length !== 64) {
    return null;
  }
  const board = value.board.map((cell) =>
    cell === "white" || cell === "black" || cell === "white-king" || cell === "black-king"
      ? cell
      : cell === null
        ? null
        : undefined,
  );
  if (board.some((cell) => cell === undefined)) {
    return null;
  }
  if (value.turn !== "white" && value.turn !== "black") {
    return null;
  }
  if (value.status !== "playing" && value.status !== "won") {
    return null;
  }
  const mustFrom =
    value.mustFrom === null
      ? null
      : typeof value.mustFrom === "number" && Number.isInteger(value.mustFrom)
        ? value.mustFrom
        : undefined;
  if (mustFrom === undefined || (mustFrom !== null && (mustFrom < 0 || mustFrom > 63))) {
    return null;
  }
  return {
    board,
    turn: value.turn,
    mustFrom,
    status: value.status,
    winner: value.winner === "white" || value.winner === "black" ? value.winner : null,
  };
}

function readRps(value: unknown): RpsState | null {
  if (
    !isRecord(value) ||
    !isRecord(value.scores) ||
    typeof value.scores.A !== "number" ||
    typeof value.scores.B !== "number" ||
    typeof value.roundsPlayed !== "number" ||
    !isRecord(value.choices)
  ) {
    return null;
  }
  const status = value.status;
  if (status !== "choosing" && status !== "revealed" && status !== "won" && status !== "draw") {
    return null;
  }
  return {
    scores: { A: value.scores.A, B: value.scores.B },
    roundsPlayed: value.roundsPlayed,
    choices: {
      A: readHand(value.choices.A),
      B: readHand(value.choices.B),
    },
    status,
    winner: value.winner === "A" || value.winner === "B" ? value.winner : null,
    lastRound: readLastRound(value.lastRound),
    deadlineAt: null,
  };
}

function readLastRound(value: unknown): RpsState["lastRound"] {
  if (!isRecord(value) || !isRecord(value.hands)) {
    return null;
  }
  const winner = value.winner;
  if (winner !== "A" && winner !== "B" && winner !== "draw") {
    return null;
  }
  return {
    hands: { A: readHand(value.hands.A), B: readHand(value.hands.B) },
    winner,
  };
}

function readHand(value: unknown): RpsHand | null {
  if (value === "rock" || value === "paper" || value === "scissors") {
    return value;
  }
  return null;
}

function readNumbers(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "number")) {
    return null;
  }
  return value;
}

function readPoints(
  value: unknown,
): ConnectFourState["winningCells"] {
  if (!Array.isArray(value)) {
    return null;
  }
  const points = [];
  for (const point of value) {
    if (
      !isRecord(point) ||
      typeof point.column !== "number" ||
      typeof point.row !== "number"
    ) {
      return null;
    }
    points.push({ column: point.column, row: point.row });
  }
  return points;
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isResult(value: unknown): value is MatchSnapshot["result"] {
  return (
    value === "playing" ||
    value === "won" ||
    value === "draw" ||
    value === "timeout" ||
    value === "abandoned"
  );
}

function isDetail(value: unknown): value is MoveDetail {
  return typeof value === "string" && (MOVE_DETAILS as readonly string[]).includes(value);
}

function isFailure(value: unknown): value is MatchFailureReason {
  return (
    typeof value === "string" &&
    (MATCH_FAILURES as readonly string[]).includes(value)
  );
}

function isGameSlug(value: unknown): value is GameSlug {
  return typeof value === "string" && getGame(value) !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
