import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalMatch } from "@/components/games/local-match";
import { NimMatch } from "@/components/games/nim-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Le tre pile in locale",
  description: "Prova Le tre pile sullo stesso dispositivo.",
};

export default function LocalNimPage() {
  return (
    <LocalMatch title="Le tre pile">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="tre-pile" />
      </Suspense>
      <NimMatch />
    </LocalMatch>
  );
}
