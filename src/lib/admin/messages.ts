import type { AdminFailureReason } from "@/lib/admin/rules";

export const adminFailureMessage: Record<AdminFailureReason, string> = {
  unauthenticated: "Per entrare serve l'account amministratore.",
  forbidden: "Questo account non è un amministratore.",
  confirmation_required: "Conferma il provvedimento prima di eseguirlo.",
  invalid: "I dati del provvedimento non sono validi.",
  not_found: "Questo elemento non è più aperto.",
  "missing-config": "Manca la configurazione Supabase.",
  unavailable:
    "L'amministrazione non è pronta. Esegui la migrazione SQL admin e riprova.",
};
