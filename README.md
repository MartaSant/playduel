# PlayDuel

Piattaforma web di minigiochi multiplayer nel browser. L'obiettivo è una sfida rapida senza registrazione tradizionale: nickname temporaneo, matchmaking casuale e stanze private condivise con un link.

Questa repository è alla **Milestone 0**. L'app che si avvia in locale è ancora il template di `create-next-app`. Homepage, giochi, Supabase, matchmaking e pannello admin arrivano nelle milestone successive.

## Stack

- Next.js (App Router) 16
- React 19
- TypeScript strict
- Tailwind CSS 4
- Supabase e Vercel sono previsti più avanti, non sono collegati in questa fase

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

`.env.local` non va committato. I valori in `.env.example` sono segnaposto: l'applicazione non li usa finché non parte il collegamento a Supabase.

## Verifica

```bash
npm run lint
npm run typecheck
```

Non c'è ancora un test runner. I test delle regole di gioco entrano con la Milestone 2.

## Struttura prevista

Le cartelle sotto `src/` sono riservate e vuote, a parte il template in `src/app/`. Non contengono ancora logica di prodotto.

```text
src/
  app/                  pagine (oggi solo il template Next.js)
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
| 1 | Homepage, navigazione, Privacy e Termini provvisori | non iniziata |
| 2 | Motori di gioco e test | non iniziata |
| 3+ | Supabase, stanze, partite, admin, lancio | non iniziate |

Privacy, termini, retention e raccolta IP non sono definiti in questa fase e vanno rivisti prima di un lancio pubblico.
