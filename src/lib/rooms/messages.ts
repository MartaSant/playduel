import type { RoomFailureReason, RoomStatus } from "@/lib/rooms/rules";

export const roomFailureMessage: Record<RoomFailureReason, string> = {
  unauthenticated: "Per continuare salva un nickname. Non serve una email.",
  profile_required: "Per continuare salva un nickname. Non serve una email.",
  invalid_game: "Questo gioco non è disponibile.",
  invalid_code: "Il codice della stanza non è valido.",
  rate_limited: "Hai creato troppe stanze nell'ultima ora. Riprova più tardi.",
  not_found: "Questa stanza non esiste.",
  expired: "Questa stanza è scaduta.",
  full: "La stanza ha già due giocatori.",
  closed: "Questa stanza è chiusa.",
  banned: "Questo profilo è sospeso fino al termine del provvedimento.",
  "missing-config":
    "Manca la configurazione Supabase. Il salvataggio delle stanze non è disponibile.",
  unavailable:
    "Le stanze non sono pronte. Esegui la migrazione SQL delle stanze e riprova.",
};

export function roomStatusMessage(status: RoomStatus, seats: number): string {
  if (status === "waiting") {
    return seats < 2
      ? "In attesa dell'altro giocatore."
      : "La stanza è aperta.";
  }
  if (status === "full") {
    return "Siete in due.";
  }
  if (status === "expired") {
    return "Questa stanza è scaduta.";
  }
  return "Questa stanza è chiusa.";
}
