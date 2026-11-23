const NICKNAME_PATTERN =
  /^[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?: [A-Za-zÀ-ÖØ-öø-ÿ0-9]+)*$/;

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

const BLOCKED_FRAGMENTS = [
  "cazzo",
  "merda",
  "stronzo",
  "fuck",
  "shit",
  "bitch",
  "nigger",
  "faggot",
] as const;

export type NicknameRejection = "empty" | "length" | "characters" | "blocked";

export type ProfileFailure =
  | NicknameRejection
  | "missing-config"
  | "unavailable"
  | "rate_limited";

export type NicknameActionState =
  | { ok: true; nickname: string }
  | { ok: false; reason: ProfileFailure };

export type ParsedNickname =
  | { ok: true; nickname: string }
  | { ok: false; reason: NicknameRejection };

export function parseNickname(input: string): ParsedNickname {
  const nickname = input.trim().replace(/ +/g, " ");
  if (nickname.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (nickname.length < MIN_LENGTH || nickname.length > MAX_LENGTH) {
    return { ok: false, reason: "length" };
  }
  if (!NICKNAME_PATTERN.test(nickname)) {
    return { ok: false, reason: "characters" };
  }
  const compact = nickname.toLocaleLowerCase("it").replaceAll(" ", "");
  if (BLOCKED_FRAGMENTS.some((fragment) => compact.includes(fragment))) {
    return { ok: false, reason: "blocked" };
  }
  return { ok: true, nickname };
}

export function playerWrite(sessionUserId: string, input: string) {
  const parsed = parseNickname(input);
  if (!parsed.ok) {
    return parsed;
  }
  return {
    ok: true as const,
    id: sessionUserId,
    nickname: parsed.nickname,
  };
}
