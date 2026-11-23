import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IntentPanel } from "@/components/games/intent-panel";
import { OnlineScreen } from "@/components/matches/online-screen";
import { games, getGame, isPlayMode, modeLabel } from "@/lib/games";

export function generateStaticParams() {
  return games.flatMap((game) =>
    (["online", "stanza"] as const).map((mode) => ({
      slug: game.slug,
      mode,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; mode: string }>;
}): Promise<Metadata> {
  const { slug, mode } = await params;
  const game = getGame(slug);
  if (!game || !isPlayMode(mode)) {
    return { title: "Pagina non trovata" };
  }

  return {
    title: `${game.name} · ${modeLabel(mode)}`,
    description: game.summary,
  };
}

export default function GameModePage({
  params,
}: {
  params: Promise<{ slug: string; mode: string }>;
}) {
  return (
    <Suspense fallback={<ModeFallback />}>
      <GameModeContent params={params} />
    </Suspense>
  );
}

async function GameModeContent({
  params,
}: {
  params: Promise<{ slug: string; mode: string }>;
}) {
  const { slug, mode } = await params;
  const game = getGame(slug);
  if (!game || !isPlayMode(mode)) {
    notFound();
  }

  if (mode === "online") {
    return <OnlineScreen game={game} />;
  }
  return <IntentPanel game={game} mode={mode} />;
}

function ModeFallback() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p role="status" className="text-lg text-muted">
        Caricamento della modalità…
      </p>
    </main>
  );
}
