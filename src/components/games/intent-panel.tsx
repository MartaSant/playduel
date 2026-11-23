import { Cabinet } from "@/components/games/cabinet";
import { GamesIcon } from "@/components/games/icons";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { ButtonLink } from "@/components/ui/button-link";
import { modeLabel, type Game, type PlayMode } from "@/lib/games";

type IntentPanelProps = {
  game: Game;
  mode: PlayMode;
};

export function IntentPanel({ game, mode }: IntentPanelProps) {
  const title = modeLabel(mode);
  const detail =
    mode === "online"
      ? "La ricerca dura due minuti. Se c'è già qualcuno in attesa per lo stesso gioco, la partita parte subito."
      : "Crea una stanza e condividi il link. L'altro giocatore entra con lo stesso codice. La partita vera arriva al passo successivo.";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Cabinet
        title={game.name}
        kicker={
          <>
            <span className="sr-only">{title}</span>
            <GamesIcon />
          </>
        }
        deck={
          <ButtonLink href="/games" variant="secondary">
            Giochi
          </ButtonLink>
        }
      >
        <p className="arcade-status" role="status">
          {title}
        </p>
        <p className="arcade-copy mt-3">{detail}</p>
        <div className="mt-5 max-w-xs">
          {mode === "stanza" ? <CreateRoomForm gameSlug={game.slug} /> : null}
        </div>
      </Cabinet>
    </main>
  );
}
