import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabinet } from "@/components/games/cabinet";
import { GameShelf } from "@/components/games/game-shelf";
import { GamesIcon } from "@/components/games/icons";
import { AccessNote } from "@/components/security/access-note";
import { games } from "@/lib/games";

export const metadata: Metadata = {
  title: "Giochi",
  description: "Tris, Forza 4 e Morra cinese. Due giocatori per modalità.",
};

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Suspense fallback={null}>
        <AccessNote action="visit" />
      </Suspense>
      <Cabinet
        title="Giochi"
        kicker={
          <>
            <span className="sr-only">Scegli la sfida</span>
            <GamesIcon />
          </>
        }
      >
        <h2 id="stanze-heading" className="sr-only">
          Modalità disponibili
        </h2>
        <GameShelf games={games} />
      </Cabinet>
      <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-5 text-muted">
        {games.map((game) => `${game.name}: ${game.coverCredit}`).join(" · ")}
      </p>
    </main>
  );
}
