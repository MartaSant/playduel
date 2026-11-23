import { createClient } from "@/lib/supabase/server";
import { parseChatResult, type ChatResult } from "@/lib/matches/chat";
import { isMatchId } from "@/lib/matches/rules";

export async function readMatchChat(matchId: string): Promise<ChatResult> {
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  return callChat("list_match_messages", { p_match: matchId });
}

export async function sendMatchChat(matchId: string, body: string): Promise<ChatResult> {
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  return callChat("send_match_message", { p_match: matchId, p_body: body });
}

async function callChat(
  name: "list_match_messages" | "send_match_message",
  args: { p_match: string } | { p_match: string; p_body: string },
): Promise<ChatResult> {
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
      console.error("chat call failed", name, error.code);
    }
    return { ok: false, reason: "unavailable" };
  }
  return parseChatResult(data);
}
