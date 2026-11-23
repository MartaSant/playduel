import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { Disc, HandMark, TicMark } from "@/components/games/marks";
import { ButtonLink } from "@/components/ui/button-link";
import type { Game, GameSlug } from "@/lib/games";

type GameCardProps = {
  game: Game;
  showActions?: boolean;
};

export function GameCard({ game, showActions = false }: GameCardProps) {
  return (
    <article
      id={showActions ? game.slug : undefined}
      className="arcade-tile scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ff7e4]">
          {game.playersLabel}
        </p>
        <GameGlyph slug={game.slug} />
      </div>
      <h2 className="mt-2 text-xl">{game.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#b7d0d8]">{game.summary}</p>
      {showActions ? (
        <div className="arcade-tile-actions">
          <ButtonLink href={`/games/${game.slug}/online`} className="arcade-coin">
            Gioca online
          </ButtonLink>
          <CreateRoomForm gameSlug={game.slug} />
          <ButtonLink href={`/local/${game.slug}`} variant="secondary">
            Prova in locale
          </ButtonLink>
        </div>
      ) : (
        <div className="arcade-tile-actions">
          <ButtonLink href={`/games#${game.slug}`} variant="secondary">
            Scegli
          </ButtonLink>
        </div>
      )}
    </article>
  );
}

function GameGlyph({ slug }: { slug: GameSlug }) {
  if (slug === "tris") {
    return (
      <span className="arcade-hud-piece">
        <TicMark mark="X" className="h-full w-full" />
      </span>
    );
  }
  if (slug === "forza-4") {
    return (
      <span className="arcade-hud-piece">
        <Disc color="red" />
      </span>
    );
  }
  return <HandMark hand="rock" />;
}
