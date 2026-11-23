import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/games";
import {
  isRoomCode,
  normalizeRoomCode,
  parseRoomResult,
  type RoomResult,
} from "@/lib/rooms/rules";

export async function createRoom(gameSlug: string): Promise<RoomResult> {
  if (!getGame(gameSlug)) {
    return { ok: false, reason: "invalid_game" };
  }
  return callRoom("create_room", { p_game_slug: gameSlug });
}

export async function readRoom(code: string): Promise<RoomResult> {
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) {
    return { ok: false, reason: "invalid_code" };
  }
  return callRoom("room_state", { p_code: normalized });
}

export async function joinRoom(code: string): Promise<RoomResult> {
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) {
    return { ok: false, reason: "invalid_code" };
  }
  return callRoom("join_room", { p_code: normalized });
}

export async function leaveRoom(code: string): Promise<RoomResult> {
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) {
    return { ok: false, reason: "invalid_code" };
  }
  return callRoom("leave_room", { p_code: normalized });
}

async function callRoom(
  name: "create_room" | "room_state" | "join_room" | "leave_room",
  args: { p_game_slug: string } | { p_code: string },
): Promise<RoomResult> {
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
      console.error("room call failed", name, error.code);
    }
    return { ok: false, reason: "unavailable" };
  }
  return parseRoomResult(data);
}
