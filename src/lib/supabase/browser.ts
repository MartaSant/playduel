import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createBrowserSupabase() {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }
  return createBrowserClient<Database>(env.url, env.anonKey);
}
