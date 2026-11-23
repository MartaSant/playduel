"use client";

import { useState } from "react";
import { useActionState } from "react";
import { fileReportAction } from "@/server/actions/admin";
import { FlagIcon } from "@/components/games/icons";
import { Button } from "@/components/ui/button";

export function ReportForm({ matchId }: { matchId: string }) {
  const [state, action, pending] = useActionState(fileReportAction, null);
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return (
      <p className="arcade-icon-btn inline-flex items-center justify-center text-xs font-semibold" role="status">
        Ok
      </p>
    );
  }

  return (
    <div className="arcade-report">
      <Button
        type="button"
        variant="secondary"
        className="arcade-icon-btn"
        aria-label="Segnala l'avversario"
        aria-expanded={open}
        aria-controls={`report-${matchId}`}
        onClick={() => setOpen((value) => !value)}
      >
        <FlagIcon />
      </Button>
      {open ? (
        <form id={`report-${matchId}`} action={action} className="arcade-report-panel">
          <input type="hidden" name="matchId" value={matchId} />
          <label htmlFor={`reason-${matchId}`} className="text-sm font-semibold">
            Motivo
            <textarea
              id={`reason-${matchId}`}
              name="reason"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              className="arcade-field mt-2 w-full rounded-xl border px-3 py-2"
            />
          </label>
          {state && !state.ok ? <p role="alert">{state.message}</p> : null}
          <Button type="submit" variant="secondary" disabled={pending}>
            Invia
          </Button>
        </form>
      ) : null}
    </div>
  );
}
