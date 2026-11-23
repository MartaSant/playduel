"use server";

import { redirect } from "next/navigation";
import { getGame } from "@/lib/games";
import {
  isRoomCode,
  normalizeRoomCode,
  type RoomResult,
} from "@/lib/rooms/rules";
import {
  createRoom,
  joinRoom,
  leaveRoom,
} from "@/server/services/rooms";

export async function createRoomAction(
  _previous: RoomResult | null,
  formData: FormData,
): Promise<RoomResult> {
  const game = formData.get("game");
  const slug = typeof game === "string" ? game : "";
  if (!getGame(slug)) {
    return { ok: false, reason: "invalid_game" };
  }
  const result = await createRoom(slug);
  if (result.ok && result.access === "member") {
    redirect(`/room/${result.code}`);
  }
  return result;
}

export async function joinRoomAction(
  _previous: RoomResult | null,
  formData: FormData,
): Promise<RoomResult> {
  const code = roomCodeFrom(formData);
  if (!code) {
    return { ok: false, reason: "invalid_code" };
  }
  const result = await joinRoom(code);
  if (result.ok && result.access === "member") {
    redirect(`/room/${result.code}`);
  }
  return result;
}

export async function leaveRoomAction(
  _previous: RoomResult | null,
  formData: FormData,
): Promise<RoomResult> {
  const code = roomCodeFrom(formData);
  if (!code) {
    return { ok: false, reason: "invalid_code" };
  }
  const result = await leaveRoom(code);
  if (result.ok) {
    redirect(`/room/${result.code}`);
  }
  return result;
}

function roomCodeFrom(formData: FormData): string | null {
  const value = formData.get("code");
  if (typeof value !== "string") {
    return null;
  }
  const code = normalizeRoomCode(value);
  return isRoomCode(code) ? code : null;
}
