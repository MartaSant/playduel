"use client";

import { useState } from "react";
import {
  CONNECT_FOUR_ROWS,
  createConnectFour,
  dropDisc,
  type ConnectFourPlayer,
  type ConnectFourRejection,
  type ConnectFourState,
} from "@/game-logic/connect-four/rules";
import { CrownIcon, ReplayIcon } from "@/components/games/icons";
import { Disc } from "@/components/games/marks";
import { Button } from "@/components/ui/button";

const PLAYER_LABEL: Record<ConnectFourPlayer, string> = {
  red: "Rosso",
  yellow: "Giallo",
};

const REJECTION: Record<ConnectFourRejection, string> = {
  "invalid-column": "Questa colonna non esiste.",
  finished: "La partita è già finita.",
  "out-of-turn": "Non è il turno di questo giocatore.",
  "column-full": "Questa colonna è piena.",
};

export function ConnectFourMatch() {
  const [state, setState] = useState<ConnectFourState>(() =>
    createConnectFour(),
  );
  const [notice, setNotice] = useState<string | null>(null);

  function drop(column: number) {
    const result = dropDisc(state, state.turn, column);
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
            <Disc color={state.status === "won" && state.winner ? state.winner : state.turn} />
          </span>
        )}
      </div>
      {notice ? (
        <p role="alert" className="arcade-alert">
          {notice}
        </p>
      ) : null}
      <div className="mx-auto mt-5 grid max-w-md grid-cols-7 gap-2 overflow-hidden rounded-3xl border border-[#0a2748] bg-[#16325c] p-3 shadow-[inset_0_0_20px_rgb(0_0_0_/_0.35)]">
        {state.columns.map((column, index) => {
          const full = column.every((cell) => cell !== null);
          const playable = state.status === "playing" && !full;
          const stacked = column
            .map((cell) => (cell ? PLAYER_LABEL[cell] : "vuota"))
            .join(", ");
          return (
            <button
              key={index}
              type="button"
              disabled={!playable}
              onClick={() => drop(index)}
              aria-label={`Inserisci nella colonna ${index + 1}. Dal basso: ${stacked}.`}
              className="flex flex-col gap-2 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white enabled:cursor-pointer enabled:hover:bg-white/10 enabled:active:bg-white/15 disabled:cursor-not-allowed"
            >
              <span className="flex h-8 items-center justify-center">
                <span className={`block h-6 w-6 ${playable ? "" : "opacity-40"}`}>
                  <Disc color={playable ? state.turn : null} />
                </span>
              </span>
              {Array.from({ length: CONNECT_FOUR_ROWS }, (_, offset) => {
                const row = CONNECT_FOUR_ROWS - 1 - offset;
                const disc = column[row] ?? null;
                const winning =
                  state.winningCells?.some(
                    (cell) => cell.column === index && cell.row === row,
                  ) ?? false;
                return (
                  <span
                    key={row}
                    className={`flex aspect-square items-center justify-center rounded-full ${winning ? "play-win bg-white/20" : ""}`}
                  >
                    <Disc color={disc} drop={disc !== null} />
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
      <div className="arcade-actions">
        <Button
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createConnectFour());
            setNotice(null);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
    </div>
  );
}
