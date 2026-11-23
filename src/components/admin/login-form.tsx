"use client";

import { useActionState } from "react";
import {
  signInAdminAction,
  verifyAdminAction,
  type AdminLoginState,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

const initialState: AdminLoginState = { step: "credentials", message: null };

export function AdminLoginForm() {
  const [state, signIn, signingIn] = useActionState(signInAdminAction, initialState);
  const [verified, verify, verifying] = useActionState(verifyAdminAction, {
    message: null,
  });

  if (state.step === "enroll" || state.step === "challenge") {
    return (
      <form action={verify} className="mt-8 flex max-w-md flex-col gap-4">
        <input type="hidden" name="factorId" value={state.factorId} />
        {state.step === "enroll" ? (
          <>
            <p className="text-muted">
              Aggiungi PlayDuel a un&apos;app di autenticazione. Poi inserisci il
              codice a 6 cifre.
            </p>
            {/* The QR is a one-time data URL, not a remote image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.qr}
              alt="Codice QR per l'app di autenticazione"
              className="h-48 w-48 bg-white p-2"
            />
            <p className="break-all font-mono text-sm">{state.secret}</p>
          </>
        ) : (
          <p className="text-muted">Inserisci il codice a 6 cifre dell&apos;app di autenticazione.</p>
        )}
        <label htmlFor="code" className="text-sm font-semibold">
          Codice
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3"
          />
        </label>
        {verified.message ? <p role="alert">{verified.message}</p> : null}
        <Button type="submit" disabled={verifying}>
          {verifying ? "Verifica…" : "Conferma codice"}
        </Button>
      </form>
    );
  }

  return (
    <form action={signIn} className="mt-8 flex max-w-md flex-col gap-4">
      <label htmlFor="email" className="text-sm font-semibold">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3"
        />
      </label>
      <label htmlFor="password" className="text-sm font-semibold">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3"
        />
      </label>
      {state.step === "credentials" && state.message ? (
        <p role="alert">{state.message}</p>
      ) : null}
      <Button type="submit" disabled={signingIn}>
        {signingIn ? "Accesso…" : "Entra"}
      </Button>
    </form>
  );
}
