import type { Metadata } from "next";
import { Cabinet } from "@/components/games/cabinet";
import { CoinIcon } from "@/components/games/icons";
import { ProvisionalNote } from "@/components/layout/provisional-note";

export const metadata: Metadata = {
  title: "Contatti",
  description: "Recapiti di PlayDuel, ancora da definire prima del lancio.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Cabinet
        title="Contatti"
        kicker={
          <>
            <span className="sr-only">Recapiti</span>
            <CoinIcon />
          </>
        }
      >
      <ProvisionalNote />
      <div className="arcade-copy mt-4">
        <p>
          Il recapito del responsabile sarà pubblicato qui prima di un lancio
          pubblico. In questa versione non c&apos;è un indirizzo email. Una
          segnalazione su una partita si invia dal tavolo di gioco, non da
          questa pagina.
        </p>
      </div>
      </Cabinet>
    </main>
  );
}
