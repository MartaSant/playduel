import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DecideForm } from "@/components/admin/decide-form";
import { adminFailureMessage } from "@/lib/admin/messages";
import { readAdminGate, readAdminReports } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Segnalazioni",
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-muted">Caricamento…</p>}>
      <ReportsScreen />
    </Suspense>
  );
}

async function ReportsScreen() {
  const gate = await readAdminGate();
  if (!gate.ok || gate.stage !== "ready") {
    redirect("/admin/login");
  }
  const reports = await readAdminReports();
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm">
        <Link href="/admin" className="underline underline-offset-4">
          Torna al riepilogo
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Segnalazioni</h1>
      {!reports.ok ? (
        <p role="alert" className="mt-6">{adminFailureMessage[reports.reason]}</p>
      ) : reports.reports.length === 0 ? (
        <p className="mt-6 text-muted">Nessuna segnalazione aperta.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {reports.reports.map((report) => (
            <li key={report.id} className="rounded-2xl border border-line p-4">
              <p className="font-semibold">
                {report.reporterNickname} segnala {report.targetNickname}
              </p>
              <p className="mt-2">{report.reason}</p>
              <p className="mt-2 text-sm text-muted">{report.createdAt}</p>
              <DecideForm reportId={report.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
