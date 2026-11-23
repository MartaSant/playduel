import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ACTIONS = [
  "visit",
  "nickname",
  "create_room",
  "join_room",
  "enqueue",
  "play",
  "abandon",
  "report",
] as const;

export type AccessAction = (typeof ACTIONS)[number];

export async function noteAccess(
  action: AccessAction,
  details: { game?: string | null; matchId?: string | null } = {},
): Promise<void> {
  const ip = await clientIp();
  if (!ip) {
    return;
  }
  const supabase = await createClient();
  if (!supabase) {
    return;
  }
  const { error } = await supabase.rpc("log_access", {
    p_ip: ip,
    p_action: action,
    p_game: details.game ?? "",
    p_match: details.matchId ?? null,
  });
  if (error && error.code !== "PGRST202") {
    console.error("access log failed", error.code);
  }
}

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const candidate = (headerList.get("x-real-ip") ?? forwarded?.split(",").at(-1) ?? "")
    .trim()
    .slice(0, 64);
  if (!isIp(candidate)) {
    return null;
  }
  return candidate;
}

function isIp(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return value.includes(":") && /^[0-9a-fA-F:]+$/.test(value);
}
