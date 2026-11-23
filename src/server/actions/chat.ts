"use server";

import { parseChatMessage, type ChatResult } from "@/lib/matches/chat";
import { isMatchId } from "@/lib/matches/rules";
import { readMatchChat, sendMatchChat } from "@/server/services/chat";

export async function readMatchChatAction(matchId: string): Promise<ChatResult> {
  return readMatchChat(matchId);
}

export async function sendMatchChatAction(
  _previous: ChatResult | null,
  formData: FormData,
): Promise<ChatResult> {
  const matchId = formData.get("matchId");
  const raw = formData.get("body");
  if (typeof matchId !== "string" || !isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  const parsed = parseChatMessage(typeof raw === "string" ? raw : "");
  if (!parsed.ok) {
    return { ok: false, reason: "invalid_message" };
  }
  return sendMatchChat(matchId, parsed.body);
}
