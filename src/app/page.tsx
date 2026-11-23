import { Suspense } from "react";
import { Cabinet } from "@/components/games/cabinet";
import { CoinIcon } from "@/components/games/icons";
import { AccessNote } from "@/components/security/access-note";
import { ButtonLink } from "@/components/ui/button-link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Suspense fallback={null}>
        <AccessNote action="visit" />
      </Suspense>
      <Cabinet
        title="PlayDuel"
        kicker={
          <>
            <span className="sr-only">Sala giochi</span>
            <CoinIcon />
          </>
        }
        deck={
          <>
            <ButtonLink href="/games" className="arcade-coin">
              Scegli i giochi
            </ButtonLink>
            <ButtonLink href="/profile" variant="secondary">
              Crea il nickname
            </ButtonLink>
          </>
        }
      >
        <p className="arcade-status">Scegli il gioco. Trova la sfida.</p>
        <p className="arcade-copy mt-3">
          Due persone, un minigioco. Un nickname temporaneo basta.
        </p>
      </Cabinet>
    </main>
  );
}
