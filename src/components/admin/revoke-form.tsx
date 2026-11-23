"use client";

import { useActionState } from "react";
import { revokeSanctionAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function RevokeForm({ sanctionId }: { sanctionId: string }) {
  const [state, action, pending] = useActionState(revokeSanctionAction, null);
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="sanctionId" value={sanctionId} />
      <label htmlFor={`note-${sanctionId}`} className="text-sm font-semibold">
        Motivo della revoca
        <input
          id={`note-${sanctionId}`}
          name="note"
          required
          minLength={3}
          maxLength={500}
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required />
        Confermo la revoca
      </label>
      {state && !state.ok ? <p role="alert">{state.message}</p> : null}
      {state?.ok ? <p>Sospensione revocata.</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        Revoca
      </Button>
    </form>
  );
}
