"use server";

import { redirect } from "next/navigation";
import { adminFailureMessage } from "@/lib/admin/messages";
import { isConfirmed } from "@/lib/admin/rules";
import { isMatchId } from "@/lib/matches/rules";
import { createClient } from "@/lib/supabase/server";
import { noteAccess } from "@/server/services/access";
import {
  decideReport,
  fileReport,
  readAdminGate,
  revokeSanction,
} from "@/server/services/admin";

export type AdminLoginState =
  | { step: "credentials"; message: string | null }
  | { step: "enroll"; factorId: string; qr: string; secret: string }
  | { step: "challenge"; factorId: string; message: string | null };

export async function signInAdminAction(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = text(formData, "email").trim();
  const password = text(formData, "password");
  if (!email.includes("@") || password.length < 8) {
    return {
      step: "credentials",
      message: "Inserisci l'email e una password di almeno 8 caratteri.",
    };
  }
  const supabase = await createClient();
  if (!supabase) {
    return { step: "credentials", message: adminFailureMessage["missing-config"] };
  }

  const existing = await supabase.auth.getUser();
  if (existing.data.user?.is_anonymous) {
    await supabase.auth.signOut();
  }
  const signed = await supabase.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.user || signed.data.user.is_anonymous) {
    return { step: "credentials", message: "Email o password non validi." };
  }

  const gate = await readAdminGate();
  if (!gate.ok) {
    await supabase.auth.signOut();
    return { step: "credentials", message: adminFailureMessage[gate.reason] };
  }
  if (gate.stage === "ready") {
    redirect("/admin");
  }

  const factors = await supabase.auth.mfa.listFactors();
  const verified = factors.data?.totp.find((factor) => factor.status === "verified");
  if (verified) {
    return { step: "challenge", factorId: verified.id, message: null };
  }
  for (const factor of factors.data?.totp ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "PlayDuel",
  });
  const qr = enrolled.data?.totp ? qrSrc(enrolled.data.totp.qr_code) : null;
  if (enrolled.error || !enrolled.data?.totp || !qr) {
    const disabled = enrolled.error?.code === "mfa_disabled";
    return {
      step: "credentials",
      message: disabled
        ? "Attiva TOTP in Authentication, sezione Multi-factor, poi riprova."
        : "La verifica in due passaggi non è disponibile.",
    };
  }
  return {
    step: "enroll",
    factorId: enrolled.data.id,
    qr,
    secret: enrolled.data.totp.secret,
  };
}

export async function verifyAdminAction(
  _previous: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const factorId = text(formData, "factorId");
  const code = text(formData, "code").replace(/\s/g, "");
  if (!factorId || !/^\d{6}$/.test(code)) {
    return { message: "Il codice deve avere 6 cifre." };
  }
  const supabase = await createClient();
  if (!supabase) {
    return { message: adminFailureMessage["missing-config"] };
  }
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { message: "Codice non accettato." };
  }
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verified.error) {
    return { message: "Codice non accettato." };
  }
  const gate = await readAdminGate();
  if (!gate.ok || gate.stage !== "ready") {
    await supabase.auth.signOut();
    return { message: "La verifica non è completa." };
  }
  redirect("/admin");
}

export async function decideReportAction(
  _previous: { ok: true } | { ok: false; message: string } | null,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const decision = text(formData, "decision");
  if (decision !== "dismiss" && decision !== "ban_24h" && decision !== "ban_7d") {
    return { ok: false, message: adminFailureMessage.invalid };
  }
  const result = await decideReport(
    text(formData, "reportId"),
    decision,
    text(formData, "note"),
    isConfirmed(formData.get("confirm")),
  );
  if (!result.ok) {
    return { ok: false, message: adminFailureMessage[result.reason] };
  }
  return result;
}

export async function revokeSanctionAction(
  _previous: { ok: true } | { ok: false; message: string } | null,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await revokeSanction(
    text(formData, "sanctionId"),
    text(formData, "note"),
    isConfirmed(formData.get("confirm")),
  );
  if (!result.ok) {
    return { ok: false, message: adminFailureMessage[result.reason] };
  }
  return result;
}

export async function fileReportAction(
  _previous: { ok: true } | { ok: false; message: string } | null,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const matchId = text(formData, "matchId");
  if (!isMatchId(matchId)) {
    return { ok: false, message: "Questa partita non esiste." };
  }
  const result = await fileReport(matchId, text(formData, "reason"));
  if (!result.ok) {
    return { ok: false, message: adminFailureMessage[result.reason] };
  }
  await noteAccess("report", { matchId });
  return result;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function qrSrc(value: string): string | null {
  if (value.startsWith("data:image/svg+xml")) {
    return value;
  }
  if (value.startsWith("<svg") && !value.toLowerCase().includes("<script")) {
    return `data:image/svg+xml;utf-8,${encodeURIComponent(value)}`;
  }
  return null;
}
