import type { Metadata } from "next";
import { ProvisionalNote } from "@/components/layout/provisional-note";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Informativa provvisoria di PlayDuel, da revisionare prima del lancio.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-6">
        <ProvisionalNote />
      </div>
      <div className="mt-8 space-y-4 leading-7 text-muted">
        <p>
          Il gioco usa una sessione anonima di Supabase e un nickname di 3–20
          caratteri. Non chiede email né password ai giocatori. L&apos;account
          con email serve solo all&apos;amministrazione ed è separato.
        </p>
        <p>
          Nel database restano il nickname, le stanze, le partite, le mosse, le
          segnalazioni e i provvedimenti. L&apos;indirizzo IP viene letto dal
          server e mostrato solo nell&apos;amministrazione, insieme ai giochi
          collegati, per gestire gli abusi. Non ci sono ban automatici per IP.
        </p>
        <p>
          Una funzione di pulizia, non esposta al sito, può togliere le ricerche
          più vecchie di 2 minuti, le partite finite da oltre 30 giorni se
          nessuno le ha segnalate, e le stanze scadute da oltre 30 giorni rimaste
          senza partite, e gli accessi più vecchi di 30 giorni. Non cancella
          giocatori, segnalazioni, sanzioni né il registro admin.
        </p>
        <p>
          Questa pulizia non riguarda backup, log dell&apos;hosting né i
          registri del fornitore di autenticazione. Finché quei sistemi non sono
          verificati, PlayDuel non promette una cancellazione completa a 30
          giorni. Manca ancora il nome del responsabile e una revisione legale.
        </p>
      </div>
    </main>
  );
}
