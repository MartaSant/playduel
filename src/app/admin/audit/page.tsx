import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { adminFailureMessage } from "@/lib/admin/messages";
import { readAdminAudit, readAdminGate } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Registro admin",
  robots: { index: false, follow: false },
};

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-muted">Caricamento…</p>}>
      <AuditScreen />
    </Suspense>
  );
}

async function AuditScreen() {
  const gate = await readAdminGate();
  if (!gate.ok || gate.stage !== "ready") {
    redirect("/admin/login");
  }
  const audit = await readAdminAudit();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm">
        <Link href="/admin" className="underline underline-offset-4">
          Torna al riepilogo
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Registro</h1>
      <p className="mt-3 max-w-xl text-muted">
        Ogni provvedimento resta scritto. Il registro non si modifica e non
        contiene indirizzi IP.
      </p>
      {!audit.ok ? (
        <p role="alert" className="mt-6">{adminFailureMessage[audit.reason]}</p>
      ) : audit.entries.length === 0 ? (
        <p className="mt-6 text-muted">Nessuna azione registrata.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {audit.entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-line p-4">
              <p className="font-semibold">{entry.action}</p>
              <p className="mt-1">{entry.summary}</p>
              <p className="mt-2 text-sm text-muted">{entry.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
