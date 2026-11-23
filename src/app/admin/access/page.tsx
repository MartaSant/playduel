import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { adminFailureMessage } from "@/lib/admin/messages";
import { readAdminAccess, readAdminGate } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Accessi",
  robots: { index: false, follow: false },
};

const ACTION_LABEL: Record<string, string> = {
  visit: "Visita",
  nickname: "Nickname",
  create_room: "Stanza",
  join_room: "Ingresso",
  enqueue: "Ricerca",
  play: "Mossa",
  abandon: "Abbandono",
  report: "Segnalazione",
};

export default function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-muted">Caricamento…</p>}>
      <AccessScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function AccessScreen({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const gate = await readAdminGate();
  if (!gate.ok || gate.stage !== "ready") {
    redirect("/admin/login");
  }
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? "").slice(0, 64);
  const access = await readAdminAccess(query);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm">
        <Link href="/admin" className="underline underline-offset-4">
          Torna al riepilogo
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Accessi</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Indirizzi visti negli ultimi 30 giorni, con nickname e giochi collegati.
        Un indirizzo condiviso può riunire persone diverse. Non c&apos;è un ban
        automatico: per sospendere un profilo usa una segnalazione.
      </p>
      <form className="mt-6 flex max-w-md flex-col gap-3" action="/admin/access">
        <label htmlFor="q" className="text-sm font-semibold">
          Cerca indirizzo o nickname
          <input
            id="q"
            name="q"
            defaultValue={query}
            maxLength={64}
            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3"
          />
        </label>
        <button type="submit" className="min-h-12 rounded-full bg-accent px-5 font-semibold text-white">
          Cerca
        </button>
      </form>
      {!access.ok ? (
        <p role="alert" className="mt-6">{adminFailureMessage[access.reason]}</p>
      ) : access.addresses.length === 0 ? (
        <p className="mt-6 text-muted">Nessun accesso registrato.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {access.addresses.map((address) => (
            <li key={address.ip} className="rounded-2xl border border-line bg-card p-4">
              <p className="font-semibold">{address.ip}</p>
              <p className="mt-1 text-sm text-muted">
                {address.events} eventi, {address.plays} mosse. Ultimo accesso{" "}
                {new Date(address.lastSeen).toLocaleString("it-IT")}.
                {address.hasSanction ? " Un profilo collegato è sospeso." : ""}
              </p>
              <p className="mt-2 text-sm">
                Nickname: {address.nicknames.length > 0 ? address.nicknames.join(", ") : "nessuno"}
              </p>
              <p className="text-sm">
                Giochi: {address.games.length > 0 ? address.games.join(", ") : "nessuno"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {access.ok && query && access.events.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {access.events.map((event) => (
            <li key={`${event.createdAt}-${event.action}-${event.ip}`} className="text-sm text-muted">
              {new Date(event.createdAt).toLocaleString("it-IT")} · {event.ip} ·{" "}
              {ACTION_LABEL[event.action] ?? event.action}
              {event.nickname ? ` · ${event.nickname}` : ""}
              {event.gameSlug ? ` · ${event.gameSlug}` : ""}
              {event.banned ? " · sospeso" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
