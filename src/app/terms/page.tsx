import type { Metadata } from "next";
import { ProvisionalNote } from "@/components/layout/provisional-note";

export const metadata: Metadata = {
  title: "Termini",
  description: "Termini provvisori di PlayDuel, da revisionare prima del lancio.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Termini</h1>
      <div className="mt-6">
        <ProvisionalNote />
      </div>
      <div className="mt-8 space-y-4 leading-7 text-muted">
        <p>
          PlayDuel offre Tris, Forza 4 e Morra cinese, sempre in due. Si può
          giocare in locale, cercare un avversario oppure aprire una stanza con
          un codice. Non ci sono pagamenti, classifiche o tornei.
        </p>
        <p>
          La Morra cinese è al meglio di 3 round e può finire a 2 vittorie. Una
          mano non scelta in tempo perde il round. In Tris e Forza 4 il turno
          scaduto chiude la partita. L&apos;abbandono assegna la vittoria
          all&apos;altro giocatore. Le regole applicate sono quelle del server.
        </p>
        <p>
          Un profilo sospeso non può cercare partite, entrare in stanza o
          giocare, per 24 ore o 7 giorni. Il provvedimento è revocabile. Il
          servizio non è ancora aperto al pubblico: mancano dominio, backup
          verificati e revisione legale.
        </p>
      </div>
    </main>
  );
}
