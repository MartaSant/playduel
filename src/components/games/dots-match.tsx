"use client";

import { useState } from "react";
import { createDots, playDots, type DotsState } from "@/game-logic/dots-and-boxes/rules";
import { Button } from "@/components/ui/button";
import { ReplayIcon } from "@/components/games/icons";

export function DotsMatch() {
  const [state, setState] = useState<DotsState>(() => createDots());
  const [notice, setNotice] = useState<string | null>(null);
  const status =
    state.status === "won" && state.winner
      ? `Vince ${state.winner}.`
      : `Tocca a ${state.turn}.`;

  function draw(edge: string) {
    const result = playDots(state, state.turn, edge);
    if (!result.ok) {
      setNotice("Questo lato non si può tracciare.");
      return;
    }
    setNotice(null);
    setState(result.state);
  }

  return (
    <div>
      <p role="status" className="arcade-status">
        {status}
      </p>
      {notice ? <p role="alert" className="arcade-alert">{notice}</p> : null}
      <div
        className="mx-auto mt-4 grid max-w-sm gap-1"
        style={{ gridTemplateColumns: "1.25rem 1fr 1.25rem 1fr 1.25rem 1fr 1.25rem" }}
      >
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
                type="button"
                disabled={state.status !== "playing" || taken}
                aria-label={`Lato orizzontale ${index + 1}`}
                onClick={() => draw(`h${index}`)}
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
                type="button"
                disabled={state.status !== "playing" || taken}
                aria-label={`Lato verticale ${index + 1}`}
                onClick={() => draw(`v${index}`)}
                className={`min-h-10 w-5 justify-self-center rounded-full ${taken ? "bg-[#9ff7e4]" : "bg-white/15"}`}
              />
            );
          }
          const box = ((row - 1) / 2) * 3 + (column - 1) / 2;
          const owner = state.boxes[box];
          return (
            <span key={slot} className="flex items-center justify-center font-bold text-[#ffd56a]">
              {owner ?? ""}
            </span>
          );
        })}
      </div>
      <div className="arcade-actions">
        <Button
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createDots());
            setNotice(null);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
    </div>
  );
}
