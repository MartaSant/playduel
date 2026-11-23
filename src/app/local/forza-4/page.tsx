import type { Metadata } from "next";
import { ConnectFourMatch } from "@/components/games/connect-four-match";
import { LocalMatch } from "@/components/games/local-match";

export const metadata: Metadata = {
  title: "Forza 4 in locale",
  description: "Prova Forza 4 sullo stesso dispositivo.",
};

export default function LocalConnectFourPage() {
  return (
    <LocalMatch title="Forza 4">
      <ConnectFourMatch />
    </LocalMatch>
  );
}
