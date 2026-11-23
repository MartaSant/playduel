import { createClient } from "@/lib/supabase/server";
import {
  parseNickname,
  playerWrite,
  type NicknameActionState,
} from "@/lib/validation/nickname";

export async function readOwnProfile(): Promise<{
  nickname: string | null;
  unavailable: boolean;
}> {
  const supabase = await createClient();
  if (!supabase) {
    return { nickname: null, unavailable: false };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { nickname: null, unavailable: false };
  }

  const profile = await supabase
    .from("players")
    .select("nickname")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile.error) {
    console.error("profile read failed", profile.error.code);
    return { nickname: null, unavailable: true };
  }

  return { nickname: profile.data?.nickname ?? null, unavailable: false };
}

export async function saveOwnNickname(
  input: string,
): Promise<NicknameActionState> {
  const parsed = parseNickname(input);
  if (!parsed.ok) {
    return parsed;
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, reason: "missing-config" };
  }

  const existing = await supabase.auth.getUser();
  let userId = existing.data.user?.id ?? null;
  if (!userId) {
    const signedIn = await supabase.auth.signInAnonymously();
    if (signedIn.error || !signedIn.data.user) {
      console.error("anonymous sign-in failed", signedIn.error?.code);
      return { ok: false, reason: "unavailable" };
    }
    userId = signedIn.data.user.id;
  }

  const saved = playerWrite(userId, input);
  if (!saved.ok) {
    return saved;
  }

  const { error } = await supabase.from("players").upsert(
    { id: saved.id, nickname: saved.nickname },
    { onConflict: "id" },
  );
  if (error) {
    if (error.code === "P0001") {
      return { ok: false, reason: "rate_limited" };
    }
    console.error("profile save failed", error.code);
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, nickname: saved.nickname };
}
