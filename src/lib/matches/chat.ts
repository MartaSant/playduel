const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CHAT_FAILURES = [
  "unauthenticated",
  "profile_required",
  "not_found",
  "forbidden",
  "invalid_message",
  "rate_limited",
  "banned",
  "missing-config",
  "unavailable",
] as const;

export type ChatFailure = (typeof CHAT_FAILURES)[number];

export type ChatMessage = {
  id: string;
  body: string;
  nickname: string;
  isYou: boolean;
};

export type ChatResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; reason: ChatFailure };

const MAX_BODY = 200;

export function parseChatMessage(input: string): { ok: true; body: string } | { ok: false } {
  const body = input.trim().replace(/\s+/g, " ");
  if (body.length < 1 || body.length > MAX_BODY || /[\u0000-\u001F\u007F]/.test(body)) {
    return { ok: false };
  }
  return { ok: true, body };
}

export function parseChatResult(value: unknown): ChatResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return { ok: false, reason: "unavailable" };
  }
  if (!value.ok) {
    return {
      ok: false,
      reason: isFailure(value.reason) ? value.reason : "unavailable",
    };
  }
  if (!Array.isArray(value.messages) || value.messages.length > 40) {
    return { ok: false, reason: "unavailable" };
  }
  const messages: ChatMessage[] = [];
  for (const entry of value.messages) {
    const message = readMessage(entry);
    if (!message) {
      return { ok: false, reason: "unavailable" };
    }
    messages.push(message);
  }
  return { ok: true, messages };
}

function readMessage(value: unknown): ChatMessage | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.body !== "string" ||
    value.body.length < 1 ||
    value.body.length > MAX_BODY ||
    typeof value.nickname !== "string" ||
    value.nickname.length < 1 ||
    value.nickname.length > 20 ||
    typeof value.isYou !== "boolean"
  ) {
    return null;
  }
  return {
    id: value.id,
    body: value.body,
    nickname: value.nickname,
    isYou: value.isYou,
  };
}

function isFailure(value: unknown): value is ChatFailure {
  return typeof value === "string" && (CHAT_FAILURES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
