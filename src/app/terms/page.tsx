import type { Metadata } from "next";
import { Cabinet } from "@/components/games/cabinet";
import { CoinIcon } from "@/components/games/icons";
import { ProvisionalNote } from "@/components/layout/provisional-note";

export const metadata: Metadata = {
  title: "Termini",
  description: "Termini provvisori di PlayDuel, da revisionare prima del lancio.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Cabinet
        title="Termini"
        kicker={
          <>
            <span className="sr-only">Regole del servizio</span>
            <CoinIcon />
          </>
        }
      >
      <ProvisionalNote />
      <div className="arcade-copy mt-4">
        <p>
          PlayDuel offre Tris, Forza 4, Morra cinese, Reversi, Punti e quadrati,
          Le tre pile e Dama, sempre in due. Si può
          giocare in locale, cercare un avversario oppure aprire una stanza con
          un codice. Non ci sono pagamenti, classifiche o tornei.
        </p>
        <p>
          La Morra cinese è al meglio di 3 round e può finire a 2 vittorie. Una
          mano non scelta in tempo perde il round. Negli altri giochi il turno
          scaduto passa all&apos;altro giocatore, senza aggiungere una mossa.
          L&apos;abbandono assegna la vittoria
          all&apos;altro giocatore. Le regole applicate sono quelle del server.
        </p>
        <p>
          Un profilo sospeso non può cercare partite, entrare in stanza o
          giocare, per 24 ore o 7 giorni. Il provvedimento è revocabile. Il
          servizio non è ancora aperto al pubblico: mancano dominio, backup
          verificati e revisione legale.
        </p>
      </div>
      </Cabinet>
    </main>
  );
}
