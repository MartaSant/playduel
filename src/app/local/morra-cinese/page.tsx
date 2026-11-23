import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalMatch } from "@/components/games/local-match";
import { RpsMatch } from "@/components/games/rps-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Morra cinese in locale",
  description: "Prova la Morra cinese sullo stesso dispositivo.",
};

export default function LocalRpsPage() {
  return (
    <LocalMatch title="Morra cinese">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="morra-cinese" />
      </Suspense>
      <RpsMatch />
    </LocalMatch>
  );
}
