import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/games";
import {
  isMatchId,
  parseMatchResult,
  type MatchResult,
} from "@/lib/matches/rules";
import { isRoomCode, normalizeRoomCode } from "@/lib/rooms/rules";

export async function readQueue(gameSlug: string): Promise<MatchResult> {
  if (!getGame(gameSlug)) {
    return { ok: false, reason: "invalid_game" };
  }
  return callMatch("queue_state", { p_game_slug: gameSlug });
}

export async function enqueue(gameSlug: string): Promise<MatchResult> {
  if (!getGame(gameSlug)) {
    return { ok: false, reason: "invalid_game" };
  }
  return callMatch("enqueue", { p_game_slug: gameSlug });
}

export async function cancelQueue(gameSlug: string): Promise<MatchResult> {
  if (!getGame(gameSlug)) {
    return { ok: false, reason: "invalid_game" };
  }
  return callMatch("cancel_queue", { p_game_slug: gameSlug });
}

export async function ensureRoomMatch(code: string): Promise<MatchResult> {
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) {
    return { ok: false, reason: "invalid_code" };
  }
  return callMatch("ensure_room_match", { p_code: normalized });
}

export async function readMatch(matchId: string): Promise<MatchResult> {
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  return callMatch("match_state", { p_match: matchId });
}

export async function playMove(
  matchId: string,
  intent: { cell: number } | { column: number } | { hand: string },
): Promise<MatchResult> {
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  return callMatch("play_move", { p_match: matchId, p_intent: intent });
}

export async function abandonMatch(matchId: string): Promise<MatchResult> {
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  return callMatch("abandon_match", { p_match: matchId });
}

export async function requestRematch(matchId: string): Promise<MatchResult> {
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  return callMatch("request_rematch", { p_match: matchId });
}

async function callMatch(
  name:
    | "queue_state"
    | "enqueue"
    | "cancel_queue"
    | "ensure_room_match"
    | "match_state"
    | "play_move"
    | "abandon_match"
    | "request_rematch",
  args:
    | { p_game_slug: string }
    | { p_code: string }
    | { p_match: string }
    | { p_match: string; p_intent: { cell: number } | { column: number } | { hand: string } },
): Promise<MatchResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, reason: "missing-config" };
  }
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === "42501") {
      return { ok: false, reason: "unauthenticated" };
    }
    if (error.code !== "PGRST202") {
      console.error("match call failed", name, error.code);
    }
    return { ok: false, reason: "unavailable" };
  }
  return parseMatchResult(data);
}
