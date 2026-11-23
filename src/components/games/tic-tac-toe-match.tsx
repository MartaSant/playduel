"use client";

import { useState } from "react";
import {
  createTicTacToe,
  playTicTacToe,
  type TicTacToePlayer,
  type TicTacToeRejection,
  type TicTacToeState,
} from "@/game-logic/tic-tac-toe/rules";
import { CrownIcon, ReplayIcon } from "@/components/games/icons";
import { TicMark } from "@/components/games/marks";
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
      <div className="arcade-hud" role="status" aria-label={status}>
        {state.status === "won" && state.winner ? <CrownIcon /> : null}
        {state.status === "draw" ? (
          <span className="arcade-letter" aria-hidden="true">
            =
          </span>
        ) : (
          <span className="arcade-hud-piece">
            <TicMark
              mark={state.status === "won" && state.winner ? state.winner : state.turn}
              className="play-mark h-full w-full"
            />
          </span>
        )}
      </div>
      {notice ? (
        <p role="alert" className="arcade-alert">
          {notice}
        </p>
      ) : null}
      <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-3 rounded-3xl border border-[#1d4c63] bg-[#041018] p-3 shadow-[inset_0_0_24px_rgb(0_0_0_/_0.45)]">
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
              className={`flex aspect-square items-center justify-center rounded-2xl border transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white enabled:hover:scale-[1.04] enabled:active:scale-95 disabled:cursor-not-allowed ${winning ? "play-win border-[#9ff7e4] bg-[#123044]" : "border-[#1d4c63] bg-[#0a1c2a] enabled:hover:border-[#9ff7e4]"}`}
            >
              <TicMark mark={cell} />
            </button>
          );
        })}
      </div>
      <div className="arcade-actions">
        <Button
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createTicTacToe());
            setNotice(null);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
    </div>
  );
}
