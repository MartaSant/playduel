"use server";

import { redirect } from "next/navigation";
import { safeRoomNext } from "@/lib/rooms/rules";
import { noteAccess } from "@/server/services/access";
import { saveOwnNickname } from "@/server/services/profile";
import type { NicknameActionState } from "@/lib/validation/nickname";

export async function saveNicknameAction(
  _previous: NicknameActionState | null,
  formData: FormData,
): Promise<NicknameActionState> {
  const nickname = formData.get("nickname");
  const result = await saveOwnNickname(
    typeof nickname === "string" ? nickname : "",
  );
  if (result.ok) {
    await noteAccess("nickname");
    const next = safeRoomNext(formData.get("next"));
    if (next) {
      redirect(next);
    }
  }
  return result;
}
