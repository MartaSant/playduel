import { getGame, type GameSlug } from "../games.ts";

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 8;
export const ROOM_MAX_PLAYERS = 2;
export const ROOM_CREATE_LIMIT_PER_HOUR = 8;

const ROOM_CODE_PATTERN = new RegExp(
  `^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`,
);

export const ROOM_STATUSES = ["waiting", "full", "expired", "closed"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export type RoomPlayer = {
  nickname: string;
  isHost: boolean;
  isYou: boolean;
};

export type RoomSnapshot = {
  ok: true;
  access: "member";
  code: string;
  gameSlug: GameSlug;
  status: RoomStatus;
  expiresAt: string;
  roomId: string;
  players: RoomPlayer[];
};

export type RoomPreview = {
  ok: true;
  access: "guest";
  code: string;
  gameSlug: GameSlug;
  status: RoomStatus;
  seats: number;
};

export const ROOM_FAILURES = [
  "unauthenticated",
  "profile_required",
  "invalid_game",
  "invalid_code",
  "rate_limited",
  "not_found",
  "expired",
  "full",
  "closed",
  "banned",
  "missing-config",
  "unavailable",
] as const;

export type RoomFailureReason = (typeof ROOM_FAILURES)[number];

export type RoomFailure = {
  ok: false;
  reason: RoomFailureReason;
};

export type RoomResult = RoomSnapshot | RoomPreview | RoomFailure;

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isRoomCode(input: string): boolean {
  return ROOM_CODE_PATTERN.test(input);
}

export function safeRoomNext(
  value: FormDataEntryValue | string | string[] | null | undefined,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !raw.startsWith("/room/")) {
    return null;
  }
  const code = raw.slice("/room/".length);
  if (raw !== `/room/${code}` || !isRoomCode(code)) {
    return null;
  }
  return raw;
}

export function seatCount(activePlayers: number): RoomStatus {
  if (activePlayers <= 0) {
    return "closed";
  }
  if (activePlayers >= ROOM_MAX_PLAYERS) {
    return "full";
  }
  return "waiting";
}

export function parseRoomResult(value: unknown): RoomResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return { ok: false, reason: "unavailable" };
  }
  if (!value.ok) {
    return {
      ok: false,
      reason: isFailure(value.reason) ? value.reason : "unavailable",
    };
  }
  if (value.access === "guest") {
    const preview = parsePreview(value);
    return preview ?? { ok: false, reason: "unavailable" };
  }
  if (value.access === "member") {
    const snapshot = parseSnapshot(value);
    return snapshot ?? { ok: false, reason: "unavailable" };
  }
  return { ok: false, reason: "unavailable" };
}

function parsePreview(value: Record<string, unknown>): RoomPreview | null {
  if (
    typeof value.code !== "string" ||
    !isRoomCode(value.code) ||
    !isGameSlug(value.gameSlug) ||
    !isStatus(value.status) ||
    typeof value.seats !== "number" ||
    !Number.isInteger(value.seats) ||
    value.seats < 0
  ) {
    return null;
  }
  return {
    ok: true,
    access: "guest",
    code: value.code,
    gameSlug: value.gameSlug,
    status: value.status,
    seats: value.seats,
  };
}

function parseSnapshot(value: Record<string, unknown>): RoomSnapshot | null {
  if (
    typeof value.code !== "string" ||
    !isRoomCode(value.code) ||
    !isGameSlug(value.gameSlug) ||
    !isStatus(value.status) ||
    typeof value.expiresAt !== "string" ||
    typeof value.roomId !== "string" ||
    !Array.isArray(value.players)
  ) {
    return null;
  }
  const players: RoomPlayer[] = [];
  for (const player of value.players) {
    if (
      !isRecord(player) ||
      typeof player.nickname !== "string" ||
      typeof player.isHost !== "boolean" ||
      typeof player.isYou !== "boolean"
    ) {
      return null;
    }
    players.push({
      nickname: player.nickname,
      isHost: player.isHost,
      isYou: player.isYou,
    });
  }
  return {
    ok: true,
    access: "member",
    code: value.code,
    gameSlug: value.gameSlug,
    status: value.status,
    expiresAt: value.expiresAt,
    roomId: value.roomId,
    players,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFailure(value: unknown): value is RoomFailureReason {
  return (
    typeof value === "string" &&
    (ROOM_FAILURES as readonly string[]).includes(value)
  );
}

function isStatus(value: unknown): value is RoomStatus {
  return (
    typeof value === "string" &&
    (ROOM_STATUSES as readonly string[]).includes(value)
  );
}

function isGameSlug(value: unknown): value is GameSlug {
  return typeof value === "string" && getGame(value) !== undefined;
}
