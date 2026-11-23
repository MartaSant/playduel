import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalMatch } from "@/components/games/local-match";
import { TicTacToeMatch } from "@/components/games/tic-tac-toe-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Tris in locale",
  description: "Prova il Tris sullo stesso dispositivo.",
};

export default function LocalTicTacToePage() {
  return (
    <LocalMatch title="Tris">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="tris" />
      </Suspense>
      <TicTacToeMatch />
    </LocalMatch>
  );
}
