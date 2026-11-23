import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectFourMatch } from "@/components/games/connect-four-match";
import { LocalMatch } from "@/components/games/local-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Forza 4 in locale",
  description: "Prova Forza 4 sullo stesso dispositivo.",
};

export default function LocalConnectFourPage() {
  return (
    <LocalMatch title="Forza 4">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="forza-4" />
      </Suspense>
      <ConnectFourMatch />
    </LocalMatch>
  );
}
