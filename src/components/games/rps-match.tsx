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
  RPS_ROUND_TIMEOUT_MS,
  type RpsHand,
  type RpsState,
} from "@/game-logic/rock-paper-scissors/rules";
import { CrownIcon, ExitIcon, PassIcon, ReplayIcon, TimerIcon } from "@/components/games/icons";
import { HandMark, RpsGestureCredit } from "@/components/games/marks";
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
      <div className="arcade-score" role="status" aria-label={matchStatus(state, handoff)}>
        <span className={picking === "A" && state.status === "choosing" && !handoff ? "arcade-score-live" : ""}>
          A {state.scores.A}
        </span>
        <span className={picking === "B" && state.status === "choosing" && !handoff ? "arcade-score-live" : ""}>
          B {state.scores.B}
        </span>
        {state.status === "choosing" ? (
          <span className="arcade-timer">
            <TimerIcon />
            {secondsLeft}
          </span>
        ) : null}
        {state.status === "won" && state.winner ? (
          <>
            <CrownIcon />
            <span className="arcade-letter">{state.winner}</span>
          </>
        ) : null}
      </div>
      {state.lastRound && !handoff ? (
        <p className="sr-only">{roundSummary(state)}</p>
      ) : null}
      {state.lastRound && !handoff ? <RoundMarks state={state} /> : null}
      {state.status === "choosing" && handoff ? (
        <div className="arcade-panel arcade-hud">
          <PassIcon />
          <Button
            className="arcade-coin arcade-icon-btn"
            aria-label="Il giocatore B sceglie"
            onClick={() => setHandoff(false)}
          >
            <span className="arcade-letter">B</span>
          </Button>
        </div>
      ) : null}
      {state.status === "choosing" && !handoff ? (
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {RPS_HANDS.map((hand) => (
            <Button
              key={hand}
              data-hand={hand}
              aria-label={HAND_LABEL[hand]}
              className="arcade-hand arcade-icon-btn"
              onClick={() => pick(hand)}
            >
              <HandMark hand={hand} className="h-16 w-16" />
            </Button>
          ))}
        </div>
      ) : null}
      {state.status === "revealed" ? (
        <div className="arcade-actions">
          <Button
            className="arcade-coin arcade-icon-btn"
            aria-label="Prossimo round"
            onClick={() => {
              const result = continueMatch(state, Date.now());
              if (result.ok) {
                setState(result.state);
                setHandoff(false);
              }
            }}
          >
            <ReplayIcon />
          </Button>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {state.status === "choosing" || state.status === "revealed" ? (
          <>
            <Button
              variant="secondary"
              className="arcade-pair-btn"
              aria-label="A abbandona"
              onClick={() => {
                const result = abandonMatch(state, "A");
                if (result.ok) {
                  setState(result.state);
                  setHandoff(false);
                }
              }}
            >
              <span className="arcade-letter">A</span>
              <ExitIcon />
            </Button>
            <Button
              variant="secondary"
              className="arcade-pair-btn"
              aria-label="B abbandona"
              onClick={() => {
                const result = abandonMatch(state, "B");
                if (result.ok) {
                  setState(result.state);
                  setHandoff(false);
                }
              }}
            >
              <span className="arcade-letter">B</span>
              <ExitIcon />
            </Button>
          </>
        ) : null}
        <Button
          className="arcade-coin arcade-icon-btn"
          aria-label="Nuova partita"
          onClick={() => {
            setState(createRockPaperScissors());
            setHandoff(false);
            setNow(0);
          }}
        >
          <ReplayIcon />
        </Button>
      </div>
      <RpsGestureCredit />
    </div>
  );
}

function RoundMarks({ state }: { state: RpsState }) {
  const round = state.lastRound;
  if (!round) {
    return null;
  }
  return (
    <div className="arcade-round mt-3" aria-hidden="true">
      <span className={round.winner === "A" ? "arcade-round-win" : "inline-flex"}>
        {round.winner === "A" ? <CrownIcon /> : null}
        {round.hands.A ? <HandMark hand={round.hands.A} /> : <TimerIcon />}
      </span>
      <span className="arcade-letter">{round.winner === "draw" ? "=" : "·"}</span>
      <span className={round.winner === "B" ? "arcade-round-win" : "inline-flex"}>
        {round.winner === "B" ? <CrownIcon /> : null}
        {round.hands.B ? <HandMark hand={round.hands.B} /> : <TimerIcon />}
      </span>
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
