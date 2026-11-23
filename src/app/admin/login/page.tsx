import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/login-form";
import { readAdminGate } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Accesso amministrazione",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-4 py-10">
          <p role="status" className="text-lg text-muted">
            Caricamento…
          </p>
        </main>
      }
    >
      <LoginScreen />
    </Suspense>
  );
}

async function LoginScreen() {
  const gate = await readAdminGate();
  if (gate.ok && gate.stage === "ready") {
    redirect("/admin");
  }
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Amministrazione</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        Accesso separato dai giocatori. Dopo la password serve un codice
        dall&apos;app di autenticazione. Gli indirizzi IP non vengono raccolti.
      </p>
      <AdminLoginForm />
    </main>
  );
}
