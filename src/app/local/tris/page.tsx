import type { Metadata } from "next";
import { LocalMatch } from "@/components/games/local-match";
import { TicTacToeMatch } from "@/components/games/tic-tac-toe-match";

export const metadata: Metadata = {
  title: "Tris in locale",
  description: "Prova il Tris sullo stesso dispositivo.",
};

export default function LocalTicTacToePage() {
  return (
    <LocalMatch title="Tris">
      <TicTacToeMatch />
    </LocalMatch>
  );
}
