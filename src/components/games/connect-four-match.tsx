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
      <p role="status" className="text-lg font-semibold">
        {status}
      </p>
      <p className="mt-2 text-sm text-muted">
        Il gettone cade nella casella libera più bassa.
      </p>
      {notice ? (
        <p role="alert" className="mt-2 text-muted">
          {notice}
        </p>
      ) : null}
      <div className="mt-6 grid max-w-md grid-cols-7 gap-2 rounded-3xl border border-line bg-[#16325c] p-3">
        <div className="col-span-7 grid grid-cols-7 gap-2">
        {state.columns.map((column, index) => {
          const full = column.every((cell) => cell !== null);
          return (
            <button
              key={index}
              type="button"
              disabled={state.status !== "playing" || full}
              onClick={() => drop(index)}
              aria-label={`Inserisci nella colonna ${index + 1}`}
              className="flex min-h-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="sr-only">Colonna {index + 1}</span>
              <span className="block h-6 w-6">
                <Disc color={state.status === "playing" && !full ? state.turn : null} />
              </span>
            </button>
          );
        })}
        </div>
        <div className="col-span-7 grid grid-cols-7 gap-2">
        {Array.from({ length: CONNECT_FOUR_ROWS }, (_, offset) => {
          const row = CONNECT_FOUR_ROWS - 1 - offset;
          return state.columns.map((column, columnIndex) => {
            const disc = column[row] ?? null;
            const winning =
              state.winningCells?.some(
                (cell) => cell.column === columnIndex && cell.row === row,
              ) ?? false;
            return (
              <div
                key={`${columnIndex}-${row}`}
                aria-label={
                  disc
                    ? `${PLAYER_LABEL[disc]}, riga ${row + 1}, colonna ${columnIndex + 1}`
                    : `Vuota, riga ${row + 1}, colonna ${columnIndex + 1}`
                }
                className={`flex aspect-square items-center justify-center rounded-full ${winning ? "bg-white/20" : ""}`}
              >
                <Disc color={disc} />
              </div>
            );
          });
        })}
        </div>
      </div>
      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            setState(createConnectFour());
            setNotice(null);
          }}
        >
          Nuova partita
        </Button>
      </div>
    </div>
  );
}
