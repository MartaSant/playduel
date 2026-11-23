"use client";

import { useState } from "react";
import {
  createReversi,
  playReversi,
  type ReversiPlayer,
  type ReversiRejection,
  type ReversiState,
} from "@/game-logic/reversi/rules";
import { Button } from "@/components/ui/button";
import { ReplayIcon } from "@/components/games/icons";

const LABEL: Record<ReversiPlayer, string> = { black: "Nero", white: "Bianco" };

const REJECTION: Record<ReversiRejection, string> = {
  "invalid-cell": "Questa casella non esiste.",
  finished: "La partita è già finita.",
  "out-of-turn": "Non è il turno di questo giocatore.",
  "no-flip": "Questa mossa non gira nessuna pedina.",
};

export function ReversiMatch() {
  const [state, setState] = useState<ReversiState>(() => createReversi());
  const [notice, setNotice] = useState<string | null>(null);
  const status =
    state.status === "won" && state.winner
      ? `Vince ${LABEL[state.winner]}.`
      : state.status === "draw"
        ? "Pareggio."
        : `Tocca a ${LABEL[state.turn]}.`;

  return (
    <div>
      <p role="status" className="arcade-status">
        {status}
      </p>
      {notice ? <p role="alert" className="arcade-alert">{notice}</p> : null}
      <div className="mx-auto mt-4 grid max-w-md grid-cols-8 gap-1 rounded-2xl bg-[#0b3d2e] p-2">
        {state.board.map((cell, index) => (
          <button
            key={index}
            type="button"
            disabled={state.status !== "playing" || cell !== null}
            aria-label={`Casella ${index + 1}${cell ? `, ${LABEL[cell]}` : ""}`}
            onClick={() => {
              const result = playReversi(state, state.turn, index);
              if (!result.ok) {
                setNotice(REJECTION[result.reason]);
                return;
              }
              setNotice(null);
              setState(result.state);
            }}
            className="flex aspect-square items-center justify-center rounded-md bg-[#127a4a] disabled:cursor-not-allowed"
          >
            {cell ? (
              <span
                className={`block h-[70%] w-[70%] rounded-full ${cell === "black" ? "bg-[#111]" : "bg-[#f4f7fb]"}`}
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="arcade-actions">
        <Button
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createReversi());
            setNotice(null);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
    </div>
  );
}
