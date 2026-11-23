import {
  parseAdminAccess,
  parseAdminAudit,
  parseAdminGate,
  parseAdminOverview,
  parseAdminReports,
  parseAdminSearch,
  parseReportResult,
  type AccessAddress,
  type AccessEvent,
  type AdminAuditEntry,
  type AdminFailure,
  type AdminGate,
  type AdminOverview,
  type AdminReport,
  type AdminSearch,
} from "@/lib/admin/rules";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export async function readAdminGate(): Promise<AdminGate> {
  return callAdmin((supabase) => supabase.rpc("admin_gate"), parseAdminGate);
}

export async function readAdminOverview(): Promise<AdminOverview | AdminFailure> {
  return callAdmin((supabase) => supabase.rpc("admin_overview"), parseAdminOverview);
}

export async function searchAdmin(query: string): Promise<AdminSearch | AdminFailure> {
  return callAdmin(
    (supabase) => supabase.rpc("admin_search", { p_query: query.slice(0, 40) }),
    parseAdminSearch,
  );
}

export async function readAdminReports(): Promise<{ ok: true; reports: AdminReport[] } | AdminFailure> {
  return callAdmin((supabase) => supabase.rpc("admin_reports"), parseAdminReports);
}

export async function readAdminAccess(
  query: string,
): Promise<{ ok: true; addresses: AccessAddress[]; events: AccessEvent[] } | AdminFailure> {
  return callAdmin(
    (supabase) => supabase.rpc("admin_access", { p_query: query.slice(0, 64) }),
    parseAdminAccess,
  );
}

export async function readAdminAudit(): Promise<{ ok: true; entries: AdminAuditEntry[] } | AdminFailure> {
  return callAdmin((supabase) => supabase.rpc("admin_audit"), parseAdminAudit);
}

export async function decideReport(
  reportId: string,
  decision: "dismiss" | "ban_24h" | "ban_7d",
  note: string,
  confirmed: boolean,
): Promise<{ ok: true } | AdminFailure> {
  return callAdmin(
    (supabase) =>
      supabase.rpc("admin_decide_report", {
        p_report: reportId,
        p_decision: decision,
        p_note: note,
        p_confirmed: confirmed,
      }),
    parseReportResult,
  );
}

export async function revokeSanction(
  sanctionId: string,
  note: string,
  confirmed: boolean,
): Promise<{ ok: true } | AdminFailure> {
  return callAdmin(
    (supabase) =>
      supabase.rpc("admin_revoke_sanction", {
        p_sanction: sanctionId,
        p_note: note,
        p_confirmed: confirmed,
      }),
    parseReportResult,
  );
}

export async function fileReport(
  matchId: string,
  reason: string,
): Promise<{ ok: true } | AdminFailure> {
  return callAdmin(
    (supabase) => supabase.rpc("file_report", { p_match: matchId, p_reason: reason }),
    parseReportResult,
  );
}

async function callAdmin<T>(
  run: (
    supabase: SupabaseClient,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
  parse: (value: unknown) => T,
): Promise<T> {
  const supabase = await createClient();
  if (!supabase) {
    return parse({ ok: false, reason: "missing-config" });
  }
  const { data, error } = await run(supabase);
  if (error) {
    if (error.code === "42501") {
      return parse({ ok: false, reason: "forbidden" });
    }
    if (error.code !== "PGRST202") {
      console.error("admin call failed", error.code);
    }
    return parse({ ok: false, reason: "unavailable" });
  }
  return parse(data);
}
