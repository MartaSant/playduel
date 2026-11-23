# PlayDuel

Piattaforma web di minigiochi multiplayer nel browser. L'obiettivo è una sfida rapida senza registrazione tradizionale: nickname temporaneo, matchmaking casuale e stanze private condivise con un link.

Questa repository è alla **Milestone 7**. Il gioco e l'amministrazione sono collegati al progetto Supabase. Il sito non è pubblicato: mancano dominio, backup verificati e revisione legale. Gli indirizzi IP non sono raccolti.

## Stack

- Next.js (App Router) 16
- React 19
- TypeScript strict
- Tailwind CSS 4
- Supabase per la sessione anonima e il profilo. Vercel non è ancora configurato

## Requisiti

- Node.js 22
- npm 11

## Avvio locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Su Windows, se `cp` non è disponibile:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

`.env.local` non va committato. I segnaposto di `.env.example` vengono trattati come configurazione assente.

Per salvare il nickname:

1. Crea un progetto Supabase.
2. In Authentication, abilita gli accessi anonimi.
3. Esegui `supabase/migrations/20261123150000_players.sql` nel SQL editor.
4. Copia URL e chiave `anon` in `.env.local`.

Non serve la chiave `service_role` per questa fase, e non va mai esposta al browser. Senza questi passi la pagina Profilo controlla comunque il nickname, ma non lo salva. La policy che impedisce di leggere i profili altrui è nel file SQL ed è verificata dal test sul testo della migrazione: non è stata eseguita su un database finché il progetto non esiste.

## Verifica

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` esegue le regole di Tris, Forza 4 e Morra cinese con il test runner di Node.

La Morra cinese locale è al meglio di 3 round e finisce anche appena un giocatore arriva a 2 vittorie. Dopo 3 round vince il punteggio più alto; a parità è pareggio. Una mano non scelta entro 30 secondi perde il round; se non sceglie nessuno, il round ricomincia. L'abbandono assegna la partita all'altro giocatore. Sono regole provvisorie, da confermare prima del multiplayer.

## Struttura prevista

Le cartelle sotto `src/` sono riservate e vuote, a parte il template in `src/app/`. Non contengono ancora logica di prodotto.

```text
src/
  app/                  pagine: home, giochi, privacy, termini, contatti
  components/           layout, giochi, matchmaking, stanze, ui
  features/             auth, players, matchmaking, rooms, matches, moderation
  lib/                  supabase, validation, security, utils
  server/               actions, services, repositories
  game-logic/           tic-tac-toe, connect-four, rock-paper-scissors
  types/
  styles/
```

## Stato

| Milestone | Contenuto | Stato |
| --- | --- | --- |
| 0 | Progetto locale, lint, TypeScript, README, env di esempio | completata in locale |
| 1 | Homepage, navigazione, Privacy e Termini provvisori | completata in locale |
| 2 | Motori di gioco, test e partite locali | completata in locale |
| 3 | Sessione anonima, nickname e policy del profilo | completata sul progetto collegato |
| 4 | Stanze private, link e aggiornamenti in tempo reale | verificata sul progetto collegato |
| 5 | Matchmaking, mosse validate dal server, timeout e rivincita | verificata sul progetto collegato |
| 6 | Accesso admin con MFA, segnalazioni, sospensioni e registro | verificata: admin accettato, giocatore anonimo escluso |
| 7 | Hardening e lancio | migrazioni applicate, deploy non fatto |

## Prima di un lancio pubblico

1. Le migrazioni `20261123210000_hardening.sql` e `20261123220000_attempt_after_profile.sql` sono applicate.
2. Nel SQL editor esegui `select public.purge_operational_data();` e, se il piano lo consente, schedulala. Non è chiamabile dal sito.
3. Attiva i backup del progetto Supabase e prova un ripristino. La funzione di pulizia non cancella i backup né i log dell'hosting.
4. Collega il dominio e il deploy su Vercel con le stesse variabili di `.env.example`. Non aggiungere la chiave `service_role`.
5. Fai rileggere Privacy e Termini da una persona competente. Il nome del responsabile non è ancora pubblicato.
6. Prova login admin, una partita da due reti e la segnalazione dopo il deploy.

Privacy e Termini descrivono il comportamento attuale e restano bozze. L'applicazione non raccoglie IP. La pulizia a 30 giorni non copre backup e log esterni.
