"use client";

import type { DamaCell, DamaState } from "@/game-logic/dama/rules";

const LABEL = { white: "Bianco", black: "Nero" } as const;

export function damaStatus(state: DamaState): string {
  if (state.status === "won" && state.winner) {
    return `Vince ${LABEL[state.winner]}.`;
  }
  if (state.mustFrom !== null) {
    return `${LABEL[state.turn]} continua a mangiare.`;
  }
  return `Tocca a ${LABEL[state.turn]}.`;
}

export function DamaGrid({
  board,
  selected,
  targets,
  disabled,
  onSquare,
}: {
  board: readonly DamaCell[];
  selected: number | null;
  targets: readonly number[];
  disabled: boolean;
  onSquare: (index: number) => void;
}) {
  return (
    <div className="mx-auto grid max-w-md grid-cols-8 overflow-hidden rounded-2xl border border-[#3a2414]">
      {board.map((cell, index) => {
        const dark = (Math.floor(index / 8) + (index % 8)) % 2 === 1;
        const aimed = targets.includes(index);
        const row = Math.floor(index / 8) + 1;
        const column = (index % 8) + 1;
        const name = cell ? pieceName(cell) : "vuota";
        return (
          <button
            key={index}
            type="button"
            disabled={disabled || !dark}
            aria-label={`Riga ${row}, colonna ${column}, ${name}`}
            aria-pressed={selected === index}
            onClick={() => onSquare(index)}
            className={`relative flex aspect-square items-center justify-center ${dark ? "bg-[#6b3a22]" : "bg-[#e7c98a]"} ${aimed ? "outline outline-2 outline-[#9ff7e4]" : ""} ${selected === index ? "outline outline-2 outline-[#ffd56a]" : ""} disabled:cursor-default`}
          >
            {cell ? <DamaPiece piece={cell} /> : null}
          </button>
        );
      })}
    </div>
  );
}

function DamaPiece({ piece }: { piece: Exclude<DamaCell, null> }) {
  const white = piece === "white" || piece === "white-king";
  const king = piece === "white-king" || piece === "black-king";
  return (
    <span
      className={`block h-[72%] w-[72%] rounded-full ${white ? "bg-[#f6f1e7]" : "bg-[#1c140f]"} ${king ? "shadow-[inset_0_0_0_3px_#e7b15a]" : ""}`}
    />
  );
}

function pieceName(piece: Exclude<DamaCell, null>): string {
  if (piece === "white") return "pedina bianca";
  if (piece === "black") return "pedina nera";
  if (piece === "white-king") return "dama bianca";
  return "dama nera";
}
