"use client";

import { useActionState } from "react";
import { fileReportAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function ReportForm({ matchId }: { matchId: string }) {
  const [state, action, pending] = useActionState(fileReportAction, null);
  if (state?.ok) {
    return <p className="mt-6 text-sm text-muted">Segnalazione inviata.</p>;
  }
  return (
    <form action={action} className="mt-8 flex max-w-md flex-col gap-3">
      <input type="hidden" name="matchId" value={matchId} />
      <label htmlFor="reason" className="text-sm font-semibold">
        Segnala l&apos;avversario
        <textarea
          id="reason"
          name="reason"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-3"
        />
      </label>
      {state && !state.ok ? <p role="alert">{state.message}</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        Invia segnalazione
      </Button>
    </form>
  );
}
