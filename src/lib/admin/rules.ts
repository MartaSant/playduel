const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ADMIN_FAILURES = [
  "unauthenticated",
  "forbidden",
  "confirmation_required",
  "invalid",
  "not_found",
  "missing-config",
  "unavailable",
] as const;

export type AdminFailureReason = (typeof ADMIN_FAILURES)[number];

export type AdminFailure = {
  ok: false;
  reason: AdminFailureReason;
};

export type AdminGate =
  | { ok: true; stage: "ready" | "mfa" }
  | AdminFailure;

export type AdminSanction = {
  id: string;
  nickname: string;
  expiresAt: string;
  reason: string;
};

export type AdminOverview = {
  ok: true;
  players: number;
  playingMatches: number;
  openRooms: number;
  openReports: number;
  activeSanctions: number;
  sanctions: AdminSanction[];
};

export type AdminSearch = {
  ok: true;
  query: string;
  players: Array<{ id: string; nickname: string; bannedUntil: string | null }>;
  rooms: Array<{ code: string; status: string; gameSlug: string }>;
  matches: Array<{ id: string; gameSlug: string; status: string; result: string }>;
};

export type AdminReport = {
  id: string;
  reason: string;
  createdAt: string;
  matchId: string | null;
  reporterNickname: string;
  targetNickname: string;
  targetId: string;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  createdAt: string;
};

export function isConfirmed(value: FormDataEntryValue | null): boolean {
  return value === "yes";
}

export function parseAdminGate(value: unknown): AdminGate {
  if (!isRecord(value)) {
    return { ok: false, reason: "unavailable" };
  }
  if (value.ok === true && (value.stage === "ready" || value.stage === "mfa")) {
    return { ok: true, stage: value.stage };
  }
  return failure(value.reason);
}

export function parseAdminOverview(value: unknown): AdminOverview | AdminFailure {
  if (!isRecord(value) || value.ok !== true) {
    return failure(isRecord(value) ? value.reason : null);
  }
  const sanctions = readSanctions(value.sanctions);
  if (
    !isCount(value.players) ||
    !isCount(value.playingMatches) ||
    !isCount(value.openRooms) ||
    !isCount(value.openReports) ||
    !isCount(value.activeSanctions) ||
    !sanctions
  ) {
    return { ok: false, reason: "unavailable" };
  }
  return {
    ok: true,
    players: value.players,
    playingMatches: value.playingMatches,
    openRooms: value.openRooms,
    openReports: value.openReports,
    activeSanctions: value.activeSanctions,
    sanctions,
  };
}

export function parseAdminSearch(value: unknown): AdminSearch | AdminFailure {
  if (!isRecord(value) || value.ok !== true || typeof value.query !== "string") {
    return failure(isRecord(value) ? value.reason : null);
  }
  if (!Array.isArray(value.players) || !Array.isArray(value.rooms) || !Array.isArray(value.matches)) {
    return { ok: false, reason: "unavailable" };
  }
  const players = [];
  for (const player of value.players) {
    if (
      !isRecord(player) ||
      typeof player.id !== "string" ||
      typeof player.nickname !== "string" ||
      (player.bannedUntil !== null && typeof player.bannedUntil !== "string")
    ) {
      return { ok: false, reason: "unavailable" };
    }
    players.push({
      id: player.id,
      nickname: player.nickname,
      bannedUntil: player.bannedUntil,
    });
  }
  const rooms = [];
  for (const room of value.rooms) {
    if (
      !isRecord(room) ||
      typeof room.code !== "string" ||
      typeof room.status !== "string" ||
      typeof room.gameSlug !== "string"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    rooms.push({ code: room.code, status: room.status, gameSlug: room.gameSlug });
  }
  const matches = [];
  for (const match of value.matches) {
    if (
      !isRecord(match) ||
      typeof match.id !== "string" ||
      typeof match.gameSlug !== "string" ||
      typeof match.status !== "string" ||
      typeof match.result !== "string"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    matches.push({
      id: match.id,
      gameSlug: match.gameSlug,
      status: match.status,
      result: match.result,
    });
  }
  return { ok: true, query: value.query, players, rooms, matches };
}

export function parseAdminReports(value: unknown): { ok: true; reports: AdminReport[] } | AdminFailure {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.reports)) {
    return failure(isRecord(value) ? value.reason : null);
  }
  const reports: AdminReport[] = [];
  for (const report of value.reports) {
    if (
      !isRecord(report) ||
      !isUuid(report.id) ||
      typeof report.reason !== "string" ||
      typeof report.createdAt !== "string" ||
      (report.matchId !== null && typeof report.matchId !== "string") ||
      typeof report.reporterNickname !== "string" ||
      typeof report.targetNickname !== "string" ||
      typeof report.targetId !== "string"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    reports.push({
      id: report.id,
      reason: report.reason,
      createdAt: report.createdAt,
      matchId: report.matchId,
      reporterNickname: report.reporterNickname,
      targetNickname: report.targetNickname,
      targetId: report.targetId,
    });
  }
  return { ok: true, reports };
}

export function parseAdminAudit(
  value: unknown,
): { ok: true; entries: AdminAuditEntry[] } | AdminFailure {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.entries)) {
    return failure(isRecord(value) ? value.reason : null);
  }
  const entries: AdminAuditEntry[] = [];
  for (const entry of value.entries) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.action !== "string" ||
      typeof entry.targetType !== "string" ||
      (entry.targetId !== null && typeof entry.targetId !== "string") ||
      typeof entry.summary !== "string" ||
      typeof entry.createdAt !== "string"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    entries.push({
      id: entry.id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      createdAt: entry.createdAt,
    });
  }
  return { ok: true, entries };
}

export type AccessAddress = {
  ip: string;
  events: number;
  plays: number;
  lastSeen: string;
  nicknames: string[];
  games: string[];
  hasSanction: boolean;
};

export type AccessEvent = {
  ip: string;
  action: string;
  gameSlug: string | null;
  matchId: string | null;
  createdAt: string;
  nickname: string | null;
  banned: boolean;
};

export function parseAdminAccess(
  value: unknown,
): { ok: true; addresses: AccessAddress[]; events: AccessEvent[] } | AdminFailure {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.addresses) || !Array.isArray(value.events)) {
    return failure(isRecord(value) ? value.reason : null);
  }
  const addresses: AccessAddress[] = [];
  for (const item of value.addresses) {
    const nicknames = readStrings(isRecord(item) ? item.nicknames : null);
    const games = readStrings(isRecord(item) ? item.games : null);
    if (
      !isRecord(item) ||
      typeof item.ip !== "string" ||
      !isCount(item.events) ||
      !isCount(item.plays) ||
      typeof item.lastSeen !== "string" ||
      nicknames === null ||
      games === null ||
      typeof item.hasSanction !== "boolean"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    addresses.push({
      ip: item.ip,
      events: item.events,
      plays: item.plays,
      lastSeen: item.lastSeen,
      nicknames,
      games,
      hasSanction: item.hasSanction,
    });
  }
  const events: AccessEvent[] = [];
  for (const item of value.events) {
    if (
      !isRecord(item) ||
      typeof item.ip !== "string" ||
      typeof item.action !== "string" ||
      (item.gameSlug !== null && typeof item.gameSlug !== "string") ||
      (item.matchId !== null && typeof item.matchId !== "string") ||
      typeof item.createdAt !== "string" ||
      (item.nickname !== null && typeof item.nickname !== "string") ||
      typeof item.banned !== "boolean"
    ) {
      return { ok: false, reason: "unavailable" };
    }
    events.push({
      ip: item.ip,
      action: item.action,
      gameSlug: item.gameSlug,
      matchId: item.matchId,
      createdAt: item.createdAt,
      nickname: item.nickname,
      banned: item.banned,
    });
  }
  return { ok: true, addresses, events };
}

export function parseReportResult(value: unknown): { ok: true } | AdminFailure {
  if (isRecord(value) && value.ok === true) {
    return { ok: true };
  }
  return failure(isRecord(value) ? value.reason : null);
}

function failure(reason: unknown): AdminFailure {
  if (typeof reason === "string" && (ADMIN_FAILURES as readonly string[]).includes(reason)) {
    return { ok: false, reason: reason as AdminFailureReason };
  }
  return { ok: false, reason: "unavailable" };
}

function readSanctions(value: unknown): AdminSanction[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const sanctions: AdminSanction[] = [];
  for (const sanction of value) {
    if (
      !isRecord(sanction) ||
      !isUuid(sanction.id) ||
      typeof sanction.nickname !== "string" ||
      typeof sanction.expiresAt !== "string" ||
      typeof sanction.reason !== "string"
    ) {
      return null;
    }
    sanctions.push({
      id: sanction.id,
      nickname: sanction.nickname,
      expiresAt: sanction.expiresAt,
      reason: sanction.reason,
    });
  }
  return sanctions;
}

function readStrings(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
