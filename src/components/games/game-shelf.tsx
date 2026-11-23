"use client";

import { useEffect, useState } from "react";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { ButtonLink } from "@/components/ui/button-link";
import type { Game, GameSlug } from "@/lib/games";

export function GameShelf({ games }: { games: readonly Game[] }) {
  const [selected, setSelected] = useState<GameSlug | null>(null);
  const current = games.find((game) => game.slug === selected) ?? null;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (games.some((game) => game.slug === hash)) {
      setSelected(hash as GameSlug);
    }
  }, [games]);

  function choose(slug: GameSlug) {
    setSelected(slug);
    window.history.replaceState(null, "", `#${slug}`);
  }

  return (
    <div>
      <ul id="crea-stanza" className="grid grid-cols-3 gap-3">
        {games.map((game) => (
          <li key={game.slug} id={game.slug} className="scroll-mt-24">
            <button
              type="button"
              aria-pressed={selected === game.slug}
              aria-label={game.name}
              onClick={() => choose(game.slug)}
              className="arcade-cover"
            >
              <img src={game.cover} alt="" />
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <div className="arcade-tile-actions mx-auto mt-4 max-w-xs">
          <ButtonLink href={`/games/${current.slug}/online`} className="arcade-coin">
            Gioca online
          </ButtonLink>
          <CreateRoomForm gameSlug={current.slug} />
          <ButtonLink href={`/local/${current.slug}`} variant="secondary">
            Prova in locale
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
