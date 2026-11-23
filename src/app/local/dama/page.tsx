import type { Metadata } from "next";
import { Suspense } from "react";
import { DamaMatch } from "@/components/games/dama-match";
import { LocalMatch } from "@/components/games/local-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Dama in locale",
  description: "Prova la Dama sullo stesso dispositivo.",
};

export default function LocalDamaPage() {
  return (
    <LocalMatch title="Dama">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="dama" />
      </Suspense>
      <DamaMatch />
    </LocalMatch>
  );
}
