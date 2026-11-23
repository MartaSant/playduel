import type { Metadata } from "next";
import { LocalMatch } from "@/components/games/local-match";
import { RpsMatch } from "@/components/games/rps-match";

export const metadata: Metadata = {
  title: "Morra cinese in locale",
  description: "Prova la Morra cinese sullo stesso dispositivo.",
};

export default function LocalRpsPage() {
  return (
    <LocalMatch title="Morra cinese">
      <RpsMatch />
    </LocalMatch>
  );
}
