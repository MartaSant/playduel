import { redirect } from "next/navigation";
import { QueueForm } from "@/components/matches/queue-form";
import { ButtonLink } from "@/components/ui/button-link";
import type { Game } from "@/lib/games";
import { readQueue } from "@/server/services/matches";

export async function OnlineScreen({ game }: { game: Game }) {
  const queue = await readQueue(game.slug);
  if (queue.ok && "access" in queue && queue.access === "matched") {
    redirect(`/match/${queue.matchId}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-medium text-accent-2">
        {game.name} · {game.playersLabel}
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        Gioca online
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        La ricerca dura due minuti. Se c&apos;è già qualcuno in attesa per lo
        stesso gioco, la partita parte subito. Non puoi essere abbinato a te
        stesso.
      </p>
      <QueueForm gameSlug={game.slug} queue={queue} />
      <div className="mt-6">
        <ButtonLink href="/games" variant="secondary">
          Torna ai giochi
        </ButtonLink>
      </div>
    </main>
  );
}
