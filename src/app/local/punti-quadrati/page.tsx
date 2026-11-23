import type { Metadata } from "next";
import { Suspense } from "react";
import { DotsMatch } from "@/components/games/dots-match";
import { LocalMatch } from "@/components/games/local-match";
import { AccessNote } from "@/components/security/access-note";

export const metadata: Metadata = {
  title: "Punti e quadrati in locale",
  description: "Prova Punti e quadrati sullo stesso dispositivo.",
};

export default function LocalDotsPage() {
  return (
    <LocalMatch title="Punti e quadrati">
      <Suspense fallback={null}>
        <AccessNote action="visit" game="punti-quadrati" />
      </Suspense>
      <DotsMatch />
    </LocalMatch>
  );
}
