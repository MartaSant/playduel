"use client";

import { useState } from "react";
import {
  createTicTacToe,
  playTicTacToe,
  type TicTacToePlayer,
  type TicTacToeRejection,
  type TicTacToeState,
} from "@/game-logic/tic-tac-toe/rules";
import { Button } from "@/components/ui/button";

const PLAYER_LABEL: Record<TicTacToePlayer, string> = {
  X: "Giocatore X",
  O: "Giocatore O",
};

const REJECTION: Record<TicTacToeRejection, string> = {
  "invalid-cell": "Questa casella non esiste.",
  finished: "La partita è già finita.",
  "out-of-turn": "Non è il turno di questo giocatore.",
  occupied: "Questa casella è già occupata.",
};

export function TicTacToeMatch() {
  const [state, setState] = useState<TicTacToeState>(() => createTicTacToe());
  const [notice, setNotice] = useState<string | null>(null);

  function play(cell: number) {
    const result = playTicTacToe(state, state.turn, cell);
    if (!result.ok) {
      setNotice(REJECTION[result.reason]);
      return;
    }
    setNotice(null);
    setState(result.state);
  }

  const status =
    state.status === "won" && state.winner
      ? `Vince ${PLAYER_LABEL[state.winner]}.`
      : state.status === "draw"
        ? "Pareggio: la griglia è piena."
        : `Tocca a ${PLAYER_LABEL[state.turn]}.`;

  return (
    <div>
      <p role="status" className="text-lg font-semibold">
        {status}
      </p>
      {notice ? (
        <p role="alert" className="mt-2 text-muted">
          {notice}
        </p>
      ) : null}
      <div className="mt-6 grid max-w-xs grid-cols-3 gap-2">
        {state.board.map((cell, index) => {
          const winning = state.winningLine?.includes(index) ?? false;
          const row = Math.floor(index / 3) + 1;
          const column = (index % 3) + 1;
          return (
            <button
              key={index}
              type="button"
              disabled={cell !== null || state.status !== "playing"}
              onClick={() => play(index)}
              aria-label={`Riga ${row}, colonna ${column}${cell ? `, ${cell}` : ", vuota"}`}
              className={`flex aspect-square items-center justify-center rounded-xl border text-3xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed ${winning ? "border-white bg-white/10" : "border-line bg-card"}`}
            >
              {cell}
            </button>
          );
        })}
      </div>
      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            setState(createTicTacToe());
            setNotice(null);
          }}
        >
          Nuova partita
        </Button>
      </div>
    </div>
  );
}
