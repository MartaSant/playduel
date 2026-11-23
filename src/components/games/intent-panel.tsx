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
      <p className="text-sm font-medium text-accent-2">
        {game.name} · {game.playersLabel}
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted" role="status">
        {detail}
      </p>
      <p className="mt-4 max-w-xl leading-7 text-muted">{game.summary}</p>
      <div className="mt-8 flex max-w-xs flex-col gap-3">
        {mode === "stanza" ? <CreateRoomForm gameSlug={game.slug} /> : null}
        <ButtonLink href="/games">Torna ai giochi</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Torna alla home
        </ButtonLink>
      </div>
    </main>
  );
}
