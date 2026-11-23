export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (url.length === 0 || anonKey.length === 0) {
    return null;
  }
  if (url.includes("your-project") || anonKey === "your-anon-key") {
    return null;
  }
  return { url, anonKey };
}
