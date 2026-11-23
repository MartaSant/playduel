"use client";

import { useEffect, useState } from "react";
import {
  abandonMatch,
  applyTimeout,
  armRound,
  chooseHand,
  continueMatch,
  createRockPaperScissors,
  RPS_HANDS,
  RPS_MAX_ROUNDS,
  RPS_ROUND_TIMEOUT_MS,
  type RpsHand,
  type RpsState,
} from "@/game-logic/rock-paper-scissors/rules";
import { Button } from "@/components/ui/button";

const HAND_LABEL: Record<RpsHand, string> = {
  rock: "Sasso",
  paper: "Carta",
  scissors: "Forbici",
};

export function RpsMatch() {
  const [state, setState] = useState<RpsState>(() => createRockPaperScissors());
  const [handoff, setHandoff] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (state.status !== "choosing") {
      return;
    }
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (state.deadlineAt === null) {
        const armed = armRound(state, current);
        if (armed.ok) {
          setState(armed.state);
        }
        return;
      }
      if (current < state.deadlineAt) {
        return;
      }
      const result = applyTimeout(state, current);
      if (!result.ok) {
        return;
      }
      setState(result.state);
      setHandoff(false);
    }, 250);
    return () => window.clearInterval(id);
  }, [state]);

  function pick(hand: RpsHand) {
    const player = state.choices.A === null ? "A" : "B";
    const result = chooseHand(state, player, hand);
    if (!result.ok) {
      return;
    }
    setState(result.state);
    setHandoff(player === "A" && result.state.status === "choosing");
  }

  const secondsLeft =
    state.deadlineAt === null || now === 0
      ? RPS_ROUND_TIMEOUT_MS / 1000
      : Math.max(0, Math.ceil((state.deadlineAt - now) / 1000));
  const picking = state.choices.A === null ? "A" : "B";

  return (
    <div>
      <p role="status" className="text-lg font-semibold">
        {matchStatus(state, handoff)}
      </p>
      <p className="mt-2 text-muted">
        Punteggio A {state.scores.A} — B {state.scores.B}. Al meglio di{" "}
        {RPS_MAX_ROUNDS}, primo a 2. La scelta resta nascosta finché non
        scelgono entrambi.
      </p>
      {state.status === "choosing" ? (
        <p className="mt-2 text-sm text-muted">
          Secondi rimasti in questo round: {secondsLeft}.
        </p>
      ) : null}
      {state.lastRound && !handoff ? (
        <p className="mt-4 text-muted">{roundSummary(state)}</p>
      ) : null}
      {state.status === "choosing" && handoff ? (
        <div className="mt-6 max-w-md rounded-2xl border border-line bg-card p-5">
          <p>Scelta registrata. Passa il dispositivo al giocatore B.</p>
          <div className="mt-4">
            <Button onClick={() => setHandoff(false)}>
              Il giocatore B sceglie
            </Button>
          </div>
        </div>
      ) : null}
      {state.status === "choosing" && !handoff ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {RPS_HANDS.map((hand) => (
            <Button key={hand} onClick={() => pick(hand)}>
              {picking === "A" ? "A" : "B"}: {HAND_LABEL[hand]}
            </Button>
          ))}
        </div>
      ) : null}
      {state.status === "revealed" ? (
        <div className="mt-6">
          <Button
            onClick={() => {
              const result = continueMatch(state, Date.now());
              if (result.ok) {
                setState(result.state);
                setHandoff(false);
              }
            }}
          >
            Prossimo round
          </Button>
        </div>
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {state.status === "choosing" || state.status === "revealed" ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const result = abandonMatch(state, "A");
                if (result.ok) {
                  setState(result.state);
                  setHandoff(false);
                }
              }}
            >
              A abbandona
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const result = abandonMatch(state, "B");
                if (result.ok) {
                  setState(result.state);
                  setHandoff(false);
                }
              }}
            >
              B abbandona
            </Button>
          </>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            setState(createRockPaperScissors());
            setHandoff(false);
            setNow(0);
          }}
        >
          Nuova partita
        </Button>
      </div>
    </div>
  );
}

function matchStatus(state: RpsState, handoff: boolean): string {
  if (state.status === "won" && state.winner) {
    return `Vince il giocatore ${state.winner}.`;
  }
  if (state.status === "draw") {
    return "Pareggio.";
  }
  if (state.status === "revealed") {
    return "Round chiuso.";
  }
  if (handoff) {
    return "Scelta registrata. Passa il dispositivo.";
  }
  if (state.choices.A === null) {
    return "Giocatore A, scegli la mano.";
  }
  return "Giocatore B, scegli la mano.";
}

function roundSummary(state: RpsState): string {
  const round = state.lastRound;
  if (!round) {
    return "";
  }
  if (round.hands.A === null || round.hands.B === null) {
    const missing = round.hands.A === null ? "A" : "B";
    const winner = round.winner === "draw" ? "nessuno" : round.winner;
    return `Giocatore ${missing} non ha scelto in tempo. Vince il giocatore ${winner}.`;
  }
  const left = HAND_LABEL[round.hands.A];
  const right = HAND_LABEL[round.hands.B];
  if (round.winner === "draw") {
    return `A ${left}, B ${right}. Round pari.`;
  }
  return `A ${left}, B ${right}. Vince il giocatore ${round.winner}.`;
}
