import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchPanel } from "@/components/matches/match-panel";
import { matchFailureMessage } from "@/lib/matches/messages";
import { isMatchId } from "@/lib/matches/rules";
import { readMatch } from "@/server/services/matches";

export const metadata: Metadata = {
  title: "Partita",
  description: "Partita online di PlayDuel.",
};

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-4 py-10">
          <p role="status" className="text-lg text-muted">
            Caricamento della partita…
          </p>
        </main>
      }
    >
      <MatchScreen params={params} />
    </Suspense>
  );
}

async function MatchScreen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isMatchId(id)) {
    notFound();
  }
  const match = await readMatch(id);
  if (!match.ok) {
    if (match.reason === "not_found" || match.reason === "forbidden") {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Partita</h1>
        <p role="alert" className="mt-4 max-w-xl text-lg text-muted">
          {matchFailureMessage[match.reason]}
        </p>
      </main>
    );
  }
  if (!("state" in match)) {
    notFound();
  }
  if (match.successorId) {
    redirect(`/match/${match.successorId}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-medium text-accent-2">
        {match.roomCode ? `Stanza ${match.roomCode}` : "Partita online"}
      </p>
      <MatchPanel key={`${match.matchId}-${match.version}`} snapshot={match} />
    </main>
  );
}
