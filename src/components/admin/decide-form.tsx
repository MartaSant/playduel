"use client";

import { useActionState } from "react";
import { decideReportAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

export function DecideForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(decideReportAction, null);
  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="reportId" value={reportId} />
      <label htmlFor={`decision-${reportId}`} className="text-sm font-semibold">
        Decisione
        <select
          id={`decision-${reportId}`}
          name="decision"
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2"
          defaultValue="dismiss"
        >
          <option value="dismiss">Archivia</option>
          <option value="ban_24h">Sospendi 24 ore</option>
          <option value="ban_7d">Sospendi 7 giorni</option>
        </select>
      </label>
      <label htmlFor={`note-${reportId}`} className="text-sm font-semibold">
        Nota, almeno 3 caratteri
        <input
          id={`note-${reportId}`}
          name="note"
          required
          minLength={3}
          maxLength={500}
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required />
        Confermo il provvedimento
      </label>
      {state && !state.ok ? <p role="alert">{state.message}</p> : null}
      {state?.ok ? <p>Provvedimento registrato.</p> : null}
      <Button type="submit" disabled={pending}>
        Registra
      </Button>
    </form>
  );
}
