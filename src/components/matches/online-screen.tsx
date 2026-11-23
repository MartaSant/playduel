import { redirect } from "next/navigation";
import { Cabinet } from "@/components/games/cabinet";
import { GamesIcon } from "@/components/games/icons";
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
      <Cabinet
        title={game.name}
        kicker={
          <>
            <span className="sr-only">Gioca online</span>
            <GamesIcon />
          </>
        }
        deck={
          <ButtonLink href="/games" variant="secondary">
            Giochi
          </ButtonLink>
        }
      >
        <p className="arcade-status">Cerca un avversario</p>
        <p className="arcade-copy mt-3">
          La ricerca dura due minuti. Se qualcuno aspetta lo stesso gioco, la
          partita parte subito.
        </p>
        <QueueForm gameSlug={game.slug} queue={queue} />
      </Cabinet>
    </main>
  );
}
