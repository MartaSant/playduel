"use client";

import { useEffect, useRef, useState } from "react";
import type { DamaState } from "@/game-logic/dama/rules";
import { damaTargets } from "@/game-logic/dama/rules";
import type { DotsState } from "@/game-logic/dots-and-boxes/rules";
import type { NimState } from "@/game-logic/nim/rules";
import type { ReversiState } from "@/game-logic/reversi/rules";
import type { MatchSnapshot } from "@/lib/matches/rules";
import { DamaGrid } from "@/components/games/dama-grid";

const REVERSI_LABEL = { black: "Nero", white: "Bianco" } as const;

export function ReversiBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (snapshot.gameSlug !== "reversi" || !("board" in snapshot.state) || snapshot.state.board.length !== 64) {
    return null;
  }
  const state = snapshot.state as ReversiState;
  const mine = snapshot.yourSeat === state.turn && snapshot.status === "playing";
  return (
    <form action={action} className="mx-auto grid max-w-md grid-cols-8 gap-1 rounded-2xl bg-[#0b3d2e] p-2">
      <input type="hidden" name="matchId" value={snapshot.matchId} />
      {state.board.map((cell, index) => (
        <button
          key={index}
          type="submit"
          name="cell"
          value={index}
          disabled={!mine || pending || cell !== null}
          aria-label={`Casella ${index + 1}${cell ? `, ${REVERSI_LABEL[cell]}` : ""}`}
          className="flex aspect-square items-center justify-center rounded-md bg-[#127a4a] disabled:cursor-not-allowed"
        >
          {cell ? (
            <span className={`block h-[70%] w-[70%] rounded-full ${cell === "black" ? "bg-[#111]" : "bg-[#f4f7fb]"}`} />
          ) : null}
        </button>
      ))}
    </form>
  );
}

export function DotsBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (snapshot.gameSlug !== "punti-quadrati" || !("horizontal" in snapshot.state)) {
    return null;
  }
  const state = snapshot.state as DotsState;
  const mine = snapshot.yourSeat === state.turn && snapshot.status === "playing";
  return (
    <form
      action={action}
      className="mx-auto grid max-w-sm gap-1"
      style={{ gridTemplateColumns: "1.25rem 1fr 1.25rem 1fr 1.25rem 1fr 1.25rem" }}
    >
      <input type="hidden" name="matchId" value={snapshot.matchId} />
      {Array.from({ length: 49 }, (_, slot) => {
        const row = Math.floor(slot / 7);
        const column = slot % 7;
        if (row % 2 === 0 && column % 2 === 0) {
          return <span key={slot} className="h-5 w-5 justify-self-center rounded-full bg-[#ffe7b0]" />;
        }
        if (row % 2 === 0) {
          const index = (row / 2) * 3 + (column - 1) / 2;
          const taken = state.horizontal[index];
          return (
            <button
              key={slot}
              type="submit"
              name="edge"
              value={`h${index}`}
              disabled={!mine || pending || taken}
              aria-label={`Lato orizzontale ${index + 1}`}
              className={`h-5 rounded-full ${taken ? "bg-[#9ff7e4]" : "bg-white/15"}`}
            />
          );
        }
        if (column % 2 === 0) {
          const index = ((row - 1) / 2) * 4 + column / 2;
          const taken = state.vertical[index];
          return (
            <button
              key={slot}
              type="submit"
              name="edge"
              value={`v${index}`}
              disabled={!mine || pending || taken}
              aria-label={`Lato verticale ${index + 1}`}
              className={`min-h-10 w-5 justify-self-center rounded-full ${taken ? "bg-[#9ff7e4]" : "bg-white/15"}`}
            />
          );
        }
        const box = ((row - 1) / 2) * 3 + (column - 1) / 2;
        return (
          <span key={slot} className="flex items-center justify-center font-bold text-[#ffd56a]">
            {state.boxes[box] ?? ""}
          </span>
        );
      })}
    </form>
  );
}

export function NimBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (snapshot.gameSlug !== "tre-pile" || !("piles" in snapshot.state)) {
    return null;
  }
  const state = snapshot.state as NimState;
  const mine = snapshot.yourSeat === state.turn && snapshot.status === "playing";
  return (
    <div className="grid grid-cols-3 gap-3">
      {state.piles.map((count, pile) => (
        <form key={pile} action={action} className="flex flex-col items-center gap-2">
          <input type="hidden" name="matchId" value={snapshot.matchId} />
          <input type="hidden" name="pile" value={pile} />
          <div className="flex min-h-28 flex-col-reverse items-center gap-1">
            {Array.from({ length: count }, (_, stone) => (
              <span key={stone} className="block h-5 w-5 rounded-full bg-[#e7b15a]" />
            ))}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((take) => (
              <button
                key={take}
                type="submit"
                name="take"
                value={take}
                disabled={!mine || pending || take > count}
                aria-label={`Pila ${pile + 1}, togli ${take}`}
                className="arcade-coin min-h-10 min-w-10 rounded-full text-sm font-bold disabled:opacity-40"
              >
                {take}
              </button>
            ))}
          </div>
        </form>
      ))}
    </div>
  );
}

export function DamaBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ from: number; to: number } | null>(null);
  const state = snapshot.gameSlug === "dama" && "mustFrom" in snapshot.state ? (snapshot.state as DamaState) : null;
  const mine = state !== null && snapshot.yourSeat === state.turn && snapshot.status === "playing";
  const targets = state && selected !== null && mine ? damaTargets(state, selected) : [];

  useEffect(() => {
    setSelected(state?.mustFrom ?? null);
    setDraft(null);
  }, [snapshot.version, state?.mustFrom]);

  useEffect(() => {
    if (draft) {
      formRef.current?.requestSubmit();
    }
  }, [draft]);

  if (!state) {
    return null;
  }

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="matchId" value={snapshot.matchId} />
      <input type="hidden" name="from" value={draft?.from ?? ""} />
      <input type="hidden" name="to" value={draft?.to ?? ""} />
      <DamaGrid
        board={state.board}
        selected={selected}
        targets={targets}
        disabled={!mine || pending}
        onSquare={(index) => {
          if (!mine || pending) {
            return;
          }
          if (selected !== null && targets.includes(index)) {
            setDraft({ from: selected, to: index });
            return;
          }
          setSelected(index);
        }}
      />
    </form>
  );
}
