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
import { Button } from "@/components/ui/button";

const PLAYER_LABEL: Record<ConnectFourPlayer, string> = {
  red: "Rosso",
  yellow: "Giallo",
};

const DISC_MARK: Record<ConnectFourPlayer, string> = {
  red: "R",
  yellow: "G",
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
        Rosso gioca con R, Giallo con G. Il gettone cade nella casella libera
        più bassa.
      </p>
      {notice ? (
        <p role="alert" className="mt-2 text-muted">
          {notice}
        </p>
      ) : null}
      <div className="mt-6 grid max-w-md grid-cols-7 gap-1">
        {state.columns.map((column, index) => {
          const full = column.every((cell) => cell !== null);
          return (
            <button
              key={index}
              type="button"
              disabled={state.status !== "playing" || full}
              onClick={() => drop(index)}
              aria-label={`Inserisci nella colonna ${index + 1}`}
              className="min-h-11 rounded-lg border border-line bg-card text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid max-w-md grid-cols-7 gap-1">
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
                className={`flex aspect-square items-center justify-center rounded-full border text-sm font-bold ${disc === "red" ? "border-[#d23b4a] bg-[#d23b4a] text-white" : ""} ${disc === "yellow" ? "border-[#f2c14e] bg-[#f2c14e] text-[#1a1404]" : ""} ${disc === null ? "border-line bg-background text-transparent" : ""} ${winning ? "outline outline-2 outline-offset-2 outline-white" : ""}`}
              >
                {disc ? DISC_MARK[disc] : "·"}
              </div>
            );
          });
        })}
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
