import { Suspense } from "react";
import { GameCard } from "@/components/games/game-card";
import { AccessNote } from "@/components/security/access-note";
import { ButtonLink } from "@/components/ui/button-link";
import { games } from "@/lib/games";

export default function Home() {
  return (
    <main>
      <Suspense fallback={null}>
        <AccessNote action="visit" />
      </Suspense>
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-2">
          PlayDuel
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Scegli il gioco. Trova la sfida.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Due persone, un minigioco, nessuna registrazione tradizionale. Un
          nickname temporaneo basta per cercare una partita o aprire una stanza.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href="/profile">Crea il nickname</ButtonLink>
          <ButtonLink href="/games" variant="secondary">
            Gioca ora
          </ButtonLink>
          <ButtonLink href="/games#crea-stanza" variant="secondary">
            Crea stanza privata
          </ButtonLink>
        </div>
      </section>
      <section
        aria-labelledby="giochi-heading"
        className="mx-auto w-full max-w-5xl px-4 pb-16"
      >
        <h2 id="giochi-heading" className="text-2xl font-semibold tracking-tight">
          Tre duelli
        </h2>
        <p className="mt-2 max-w-xl text-muted">
          Ogni modalità è per due giocatori. Scegline una per vedere come
          entrare.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {games.map((game) => (
            <li key={game.slug}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
