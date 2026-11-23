"use client";

import { useState } from "react";
import { createDama, damaTargets, playDama, type DamaRejection } from "@/game-logic/dama/rules";
import { DamaGrid, damaStatus } from "@/components/games/dama-grid";
import { Button } from "@/components/ui/button";
import { ReplayIcon } from "@/components/games/icons";

const NOTICE: Record<DamaRejection, string> = {
  finished: "La partita è già finita.",
  "out-of-turn": "Non è il tuo turno.",
  "invalid-square": "Questa casella non si usa.",
  "empty-from": "Qui non c'è una pedina.",
  "not-your-piece": "Questa pedina non è tua.",
  occupied: "Questa casella è occupata.",
  "must-capture": "Devi mangiare.",
  "must-continue": "Continua a mangiare con la stessa pedina.",
  "invalid-move": "Questa mossa non è valida.",
};

export function DamaMatch() {
  const [state, setState] = useState(() => createDama());
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const targets = selected === null ? [] : damaTargets(state, selected);

  function choose(index: number) {
    if (state.status !== "playing") {
      return;
    }
    if (selected === null || (targets.length === 0 && !targets.includes(index))) {
      setSelected(index);
      setNotice(null);
      return;
    }
    if (index === selected) {
      setSelected(null);
      return;
    }
    if (!targets.includes(index)) {
      setSelected(index);
      return;
    }
    const result = playDama(state, state.turn, selected, index);
    if (!result.ok) {
      setNotice(NOTICE[result.reason]);
      return;
    }
    setState(result.state);
    setSelected(result.state.mustFrom);
    setNotice(null);
  }

  return (
    <div>
      <p role="status" className="arcade-status">
        {damaStatus(state)}
      </p>
      {notice ? (
        <p role="alert" className="arcade-alert">
          {notice}
        </p>
      ) : null}
      <div className="mt-4">
        <DamaGrid
          board={state.board}
          selected={selected}
          targets={targets}
          disabled={state.status !== "playing"}
          onSquare={choose}
        />
      </div>
      <div className="mt-4 flex justify-center">
        <Button
          type="button"
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createDama());
            setSelected(null);
            setNotice(null);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
    </div>
  );
}
