import type { Metadata } from "next";
import { ProvisionalNote } from "@/components/layout/provisional-note";

export const metadata: Metadata = {
  title: "Contatti",
  description: "Recapiti di PlayDuel, ancora da definire prima del lancio.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Contatti</h1>
      <div className="mt-6">
        <ProvisionalNote />
      </div>
      <div className="mt-8 space-y-4 leading-7 text-muted">
        <p>
          Il recapito del responsabile sarà pubblicato qui prima di un lancio
          pubblico. In questa versione non c&apos;è un indirizzo email. Una
          segnalazione su una partita si invia dal tavolo di gioco, non da
          questa pagina.
        </p>
      </div>
    </main>
  );
}
