import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RevokeForm } from "@/components/admin/revoke-form";
import { adminFailureMessage } from "@/lib/admin/messages";
import { readAdminGate, readAdminOverview, searchAdmin } from "@/server/services/admin";

export const metadata: Metadata = {
  title: "Amministrazione",
  robots: { index: false, follow: false },
};

export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-muted">Caricamento…</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const gate = await readAdminGate();
  if (!gate.ok || gate.stage !== "ready") {
    redirect("/admin/login");
  }
  const [{ q }, overview] = await Promise.all([searchParams, readAdminOverview()]);
  const query = (Array.isArray(q) ? q[0] : q ?? "").slice(0, 40);
  const found = query ? await searchAdmin(query) : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Amministrazione</h1>
      <nav aria-label="Sezioni admin" className="mt-4 flex gap-4">
        <Link href="/admin/reports" className="underline underline-offset-4">
          Segnalazioni
        </Link>
        <Link href="/admin/audit" className="underline underline-offset-4">
          Registro
        </Link>
      </nav>
      {!overview.ok ? (
        <p role="alert" className="mt-6">{adminFailureMessage[overview.reason]}</p>
      ) : (
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <Count label="Giocatori" value={overview.players} />
          <Count label="Partite in corso" value={overview.playingMatches} />
          <Count label="Stanze aperte" value={overview.openRooms} />
          <Count label="Segnalazioni aperte" value={overview.openReports} />
          <Count label="Sospensioni attive" value={overview.activeSanctions} />
        </dl>
      )}
      <form className="mt-10 flex max-w-md flex-col gap-3" action="/admin">
        <label htmlFor="q" className="text-sm font-semibold">
          Cerca nickname, codice stanza o id partita
          <input
            id="q"
            name="q"
            defaultValue={query}
            maxLength={40}
            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 rounded-full bg-accent px-5 font-semibold text-white"
        >
          Cerca
        </button>
      </form>
      {found && !found.ok ? (
        <p role="alert" className="mt-4">{adminFailureMessage[found.reason]}</p>
      ) : null}
      {found && found.ok ? <SearchResults found={found} /> : null}
      {overview.ok && overview.sanctions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Sospensioni attive</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {overview.sanctions.map((sanction) => (
              <li key={sanction.id} className="rounded-2xl border border-line p-4">
                <p className="font-semibold">{sanction.nickname}</p>
                <p className="text-sm text-muted">Fino al {sanction.expiresAt}</p>
                <p className="mt-2">{sanction.reason}</p>
                <RevokeForm sanctionId={sanction.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function SearchResults({
  found,
}: {
  found: {
    players: Array<{ id: string; nickname: string; bannedUntil: string | null }>;
    rooms: Array<{ code: string; status: string; gameSlug: string }>;
    matches: Array<{ id: string; gameSlug: string; status: string; result: string }>;
  };
}) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      <ResultList title="Giocatori">
        {found.players.map((player) => (
          <li key={player.id}>
            {player.nickname}
            <span className="text-muted"> · {player.id}</span>
            {player.bannedUntil ? (
              <span className="text-muted"> · sospeso fino al {player.bannedUntil}</span>
            ) : null}
          </li>
        ))}
      </ResultList>
      <ResultList title="Stanze">
        {found.rooms.map((room) => (
          <li key={room.code}>
            {room.code} · {room.gameSlug} · {room.status}
          </li>
        ))}
      </ResultList>
      <ResultList title="Partite">
        {found.matches.map((match) => (
          <li key={match.id}>
            {match.gameSlug} · {match.status} · {match.result}
          </li>
        ))}
      </ResultList>
    </div>
  );
}

function ResultList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </section>
  );
}
