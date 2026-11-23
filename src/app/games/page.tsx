import type { Metadata } from "next";
import { GameCard } from "@/components/games/game-card";
import { games } from "@/lib/games";

export const metadata: Metadata = {
  title: "Giochi",
  description: "Tris, Forza 4 e Morra cinese. Due giocatori per modalità.",
};

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Scegli la sfida
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
        «Gioca online» cerca un avversario. «Crea stanza privata» apre un link
        da condividere. «Prova in locale» fa giocare due persone sullo stesso
        dispositivo.
      </p>
      <section id="crea-stanza" aria-labelledby="stanze-heading" className="mt-10">
        <h2 id="stanze-heading" className="sr-only">
          Modalità disponibili
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {games.map((game) => (
            <li key={game.slug} className="scroll-mt-24">
              <GameCard game={game} showActions />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
