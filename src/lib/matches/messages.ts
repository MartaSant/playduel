import type { MatchFailureReason, MoveDetail } from "@/lib/matches/rules";

export const matchFailureMessage: Record<MatchFailureReason, string> = {
  unauthenticated: "Per continuare salva un nickname. Non serve una email.",
  profile_required: "Per continuare salva un nickname. Non serve una email.",
  invalid_game: "Questo gioco non è disponibile.",
  invalid_code: "Il codice della stanza non è valido.",
  not_found: "Questa partita non esiste.",
  forbidden: "Non fai parte di questa partita.",
  not_ready: "La partita non è ancora pronta.",
  invalid_move: "Questa mossa non è valida.",
  rate_limited: "Troppe mosse in un minuto. Aspetta un momento.",
  banned: "Questo profilo è sospeso fino al termine del provvedimento.",
  "missing-config":
    "Manca la configurazione Supabase. Le partite online non sono disponibili.",
  unavailable:
    "Le partite non sono pronte. Esegui la migrazione SQL delle partite e riprova.",
};

export const moveDetailMessage: Record<MoveDetail, string> = {
  "invalid-cell": "Questa casella non esiste.",
  occupied: "Questa casella è già occupata.",
  "out-of-turn": "Non è il tuo turno.",
  finished: "La partita è già finita.",
  "invalid-column": "Questa colonna non esiste.",
  "column-full": "Questa colonna è piena.",
  "invalid-hand": "Questa mano non è valida.",
  "already-chosen": "Hai già scelto in questo round.",
  "not-choosing": "Adesso non si può scegliere.",
  "no-flip": "Questa mossa non gira nessuna pedina.",
  "invalid-edge": "Questo lato non esiste.",
  "edge-taken": "Questo lato è già tracciato.",
  "invalid-pile": "Questa pila non esiste.",
  "invalid-take": "Puoi togliere da una a tre pietre, non più di quelle rimaste.",
  "invalid-square": "Questa casella non si usa.",
  "empty-from": "Qui non c'è una pedina.",
  "not-your-piece": "Questa pedina non è tua.",
  "must-capture": "Devi mangiare.",
  "must-continue": "Continua a mangiare con la stessa pedina.",
};
