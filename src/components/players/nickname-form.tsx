"use client";

import { useActionState } from "react";
import { saveNicknameAction } from "@/server/actions/profile";
import type { NicknameActionState } from "@/lib/validation/nickname";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";

const MESSAGES: Record<
  Exclude<NicknameActionState, { ok: true }>["reason"],
  string
> = {
  empty: "Inserisci un nickname.",
  length: "Usa da 3 a 20 caratteri.",
  characters: "Sono ammesse lettere, numeri e spazi singoli.",
  blocked:
    "Questo nickname non è consentito. Il filtro automatico non copre ogni abuso.",
  "missing-config":
    "Manca la configurazione Supabase. Servono URL, chiave anon, la migrazione SQL e gli accessi anonimi abilitati.",
  unavailable:
    "Il profilo non è stato salvato. Controlla che l'accesso anonimo sia abilitato e che la migrazione sia applicata.",
  rate_limited: "Hai cambiato nickname troppe volte. Riprova più tardi.",
};

type NicknameFormProps = {
  nickname: string;
  configured: boolean;
  next?: string;
};

export function NicknameForm({
  nickname,
  configured,
  next = "",
}: NicknameFormProps) {
  const [state, action, pending] = useActionState(saveNicknameAction, null);
  const shownNickname = state?.ok ? state.nickname : nickname;
  const nicknameReady = state?.ok === true || nickname.length > 0;

  return (
    <form action={action} className="mt-6 max-w-md">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label htmlFor="nickname" className="block text-sm font-semibold">
        Nickname
      </label>
      <input
        id="nickname"
        name="nickname"
        defaultValue={shownNickname}
        maxLength={20}
        autoComplete="nickname"
        required
        aria-describedby="nickname-help"
        className="mt-2 min-h-12 w-full rounded-xl border border-line bg-card px-4 text-base text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      />
      <p id="nickname-help" className="mt-2 text-sm text-muted">
        Da 3 a 20 caratteri: lettere, numeri e spazi. Nessuna email e nessuna
        password.
      </p>
      {state && !state.ok ? (
        <p role="alert" className="mt-3 text-sm text-foreground">
          {MESSAGES[state.reason]}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="mt-3 text-sm text-foreground">
          Nickname salvato: {state.nickname}.
        </p>
      ) : null}
      {!configured ? (
        <p className="mt-3 text-sm text-muted">
          In questa copia locale Supabase non è configurato. Il controllo del
          nickname funziona comunque; il salvataggio no.
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva nickname"}
        </Button>
        {nicknameReady ? (
          <ButtonLink href="/games" variant="secondary">
            Scegli un gioco
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}
