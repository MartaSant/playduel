"use client";

import { useState } from "react";
import { createNim, playNim, type NimState } from "@/game-logic/nim/rules";
import { Button } from "@/components/ui/button";
import { ReplayIcon } from "@/components/games/icons";

export function NimMatch() {
  const [state, setState] = useState<NimState>(() => createNim());
  const [notice, setNotice] = useState<string | null>(null);
  const status =
    state.status === "won" && state.winner
      ? `Vince ${state.winner}.`
      : `Tocca a ${state.turn}.`;

  return (
    <div>
      <p role="status" className="arcade-status">
        {status}
      </p>
      {notice ? <p role="alert" className="arcade-alert">{notice}</p> : null}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {state.piles.map((count, pile) => (
          <div key={pile} className="flex flex-col items-center gap-2">
            <div className="flex min-h-28 flex-col-reverse items-center gap-1">
              {Array.from({ length: count }, (_, stone) => (
                <span key={stone} className="block h-5 w-5 rounded-full bg-[#e7b15a]" />
              ))}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((take) => (
                <button
                  key={take}
                  type="button"
                  disabled={state.status !== "playing" || take > count}
                  aria-label={`Pila ${pile + 1}, togli ${take}`}
                  className="arcade-coin min-h-10 min-w-10 rounded-full text-sm font-bold disabled:opacity-40"
                  onClick={() => {
                    const result = playNim(state, state.turn, pile, take);
                    if (!result.ok) {
                      setNotice("Questa presa non è valida.");
                      return;
                    }
                    setNotice(null);
                    setState(result.state);
                  }}
                >
                  {take}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="arcade-actions">
        <Button
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createNim());
            setNotice(null);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
    </div>
  );
}
