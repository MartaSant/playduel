import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalMatch } from "@/components/games/local-match";
import { ReversiMatch } from "@/components/games/reversi-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Reversi in locale",
  description: "Prova Reversi sullo stesso dispositivo.",
};

export default function LocalReversiPage() {
  return (
    <LocalMatch title="Reversi">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="reversi" />
      </Suspense>
      <ReversiMatch />
    </LocalMatch>
  );
}
