import Link from "next/link";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { ButtonLink } from "@/components/ui/button-link";
import type { Game } from "@/lib/games";

type GameCardProps = {
  game: Game;
  showActions?: boolean;
};

export function GameCard({ game, showActions = false }: GameCardProps) {
  return (
    <article
      id={showActions ? game.slug : undefined}
      className="flex h-full scroll-mt-24 flex-col rounded-2xl border border-line bg-card p-5"
    >
      <p className="text-sm font-medium text-accent-2">{game.playersLabel}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{game.name}</h2>
      <p className="mt-2 flex-1 text-base leading-7 text-muted">{game.summary}</p>
      {showActions ? (
        <div className="mt-5 flex flex-col gap-3">
          <ButtonLink href={`/games/${game.slug}/online`}>Gioca online</ButtonLink>
          <CreateRoomForm gameSlug={game.slug} />
          <Link
            href={`/local/${game.slug}`}
            className="inline-flex min-h-11 items-center justify-center font-semibold text-accent-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Prova in locale
          </Link>
        </div>
      ) : (
        <Link
          href={`/games#${game.slug}`}
          className="mt-5 inline-flex min-h-11 items-center font-semibold text-accent-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Scegli {game.name}
        </Link>
      )}
    </article>
  );
}
