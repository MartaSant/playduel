"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import Link from "next/link";
import { CONNECT_FOUR_ROWS } from "@/game-logic/connect-four/rules";
import { RPS_HANDS, type RpsHand } from "@/game-logic/rock-paper-scissors/rules";
import {
  matchFailureMessage,
  moveDetailMessage,
} from "@/lib/matches/messages";
import {
  nicknameForSeat,
  type MatchResult,
  type MatchSnapshot,
} from "@/lib/matches/rules";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  abandonMatchAction,
  playMoveAction,
  rematchAction,
} from "@/server/actions/matches";
import { ReportForm } from "@/components/admin/report-form";
import { DamaBoard, DotsBoard, NimBoard, ReversiBoard } from "@/components/matches/extra-boards";
import { Cabinet } from "@/components/games/cabinet";
import {
  CrownIcon,
  ExitIcon,
  GamesIcon,
  ReplayIcon,
  SignalIcon,
  TimerIcon,
} from "@/components/games/icons";
import { Disc, HandMark, RpsGestureCredit, TicMark } from "@/components/games/marks";
import { Button } from "@/components/ui/button";

const HAND_LABEL: Record<RpsHand, string> = {
  rock: "Sasso",
  paper: "Carta",
  scissors: "Forbici",
};

const GAME_TITLE: Record<MatchSnapshot["gameSlug"], string> = {
  tris: "Tris",
  "forza-4": "Forza 4",
  "morra-cinese": "Morra cinese",
  reversi: "Reversi",
  "punti-quadrati": "Punti e quadrati",
  "tre-pile": "Le tre pile",
  dama: "Dama",
};

const SEAT_LABEL: Record<string, string> = {
  X: "X",
  O: "O",
  red: "Rosso",
  yellow: "Giallo",
  A: "A",
  B: "B",
  black: "Nero",
  white: "Bianco",
};

export function MatchPanel({
  snapshot,
  titleLevel = "h1",
}: {
  snapshot: MatchSnapshot;
  titleLevel?: "h1" | "h2";
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [move, moveAction, movePending] = useActionState(playMoveAction, null);
  const [rematch, rematchForm, rematchPending] = useActionState(rematchAction, null);
  const [abandoned, abandonForm, abandonPending] = useActionState(
    abandonMatchAction,
    null,
  );

  useEffect(() => {
    if (snapshot.successorId) {
      router.push(`/match/${snapshot.successorId}`);
    }
  }, [router, snapshot.successorId]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const refresh = () => router.refresh();
    const channel = supabase
      ?.channel(`match-${snapshot.matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${snapshot.matchId}`,
        },
        refresh,
      )
      .subscribe();
    const interval = window.setInterval(() => {
      if (snapshot.deadlineAt && snapshot.status === "playing") {
        const left = Math.ceil(
          (new Date(snapshot.deadlineAt).getTime() - Date.now()) / 1000,
        );
        setSeconds(Math.max(0, left));
      }
      if (snapshot.status === "playing") {
        refresh();
      }
    }, 1000);
    return () => {
      window.clearInterval(interval);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router, snapshot.deadlineAt, snapshot.matchId, snapshot.status]);

  const notice = firstNotice(move, rematch, abandoned);

  return (
    <section className="arcade-stage">
      <Cabinet
        title={GAME_TITLE[snapshot.gameSlug]}
        kicker={
          <>
            <span className="sr-only">
              {snapshot.roomCode ? `Stanza ${snapshot.roomCode}` : "Partita online"}
            </span>
            <SignalIcon />
            {snapshot.roomCode ? snapshot.roomCode : null}
          </>
        }
        level={titleLevel}
        deck={
          <>
            {snapshot.status === "playing" ? (
              <form action={abandonForm}>
                <input type="hidden" name="matchId" value={snapshot.matchId} />
                <Button
                  type="submit"
                  variant="secondary"
                  className="arcade-icon-btn"
                  aria-label="Abbandona la partita"
                  disabled={abandonPending}
                >
                  <ExitIcon />
                </Button>
              </form>
            ) : (
              <form action={rematchForm}>
                <input type="hidden" name="matchId" value={snapshot.matchId} />
                <Button
                  type="submit"
                  className="arcade-coin arcade-icon-btn"
                  aria-label={snapshot.youRequested ? "Rivincita chiesta" : "Rivincita"}
                  disabled={rematchPending || snapshot.youRequested}
                >
                  <ReplayIcon />
                </Button>
              </form>
            )}
            {snapshot.players.length > 1 ? <ReportForm matchId={snapshot.matchId} /> : null}
            <Link
              href="/games"
              aria-label="Torna ai giochi"
              className="arcade-icon-btn inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-[#1a1612] font-semibold text-foreground"
            >
              <GamesIcon />
            </Link>
          </>
        }
      >
        <p className="sr-only" role="status">
          {headline(snapshot)}
        </p>
        <TurnPiece snapshot={snapshot} />
        <ul className="arcade-players">
          {snapshot.players.map((player) => (
            <li key={`${player.nickname}-${player.seat}`}>
              <SeatPiece seat={player.seat} />
              <span>{player.nickname}</span>
              {player.isYou ? <span className="arcade-you" aria-label="tu" /> : null}
            </li>
          ))}
        </ul>
        {snapshot.status === "playing" && seconds !== null ? (
          <p className="arcade-timer arcade-hint">
            <TimerIcon />
            {seconds}
          </p>
        ) : null}
        {notice ? (
          <p role="alert" className="arcade-alert">
            {notice}
          </p>
        ) : null}
        <div className="mt-5">
          {snapshot.gameSlug === "tris" ? (
            <TrisBoard
              snapshot={snapshot}
              action={moveAction}
              pending={movePending}
            />
          ) : null}
          {snapshot.gameSlug === "forza-4" ? (
            <ConnectFourBoard
              snapshot={snapshot}
              action={moveAction}
              pending={movePending}
            />
          ) : null}
          {snapshot.gameSlug === "morra-cinese" ? (
            <RpsBoard
              snapshot={snapshot}
              action={moveAction}
              pending={movePending}
            />
          ) : null}
          {snapshot.gameSlug === "reversi" ? (
            <ReversiBoard snapshot={snapshot} action={moveAction} pending={movePending} />
          ) : null}
          {snapshot.gameSlug === "punti-quadrati" ? (
            <DotsBoard snapshot={snapshot} action={moveAction} pending={movePending} />
          ) : null}
          {snapshot.gameSlug === "tre-pile" ? (
            <NimBoard snapshot={snapshot} action={moveAction} pending={movePending} />
          ) : null}
          {snapshot.gameSlug === "dama" ? (
            <DamaBoard snapshot={snapshot} action={moveAction} pending={movePending} />
          ) : null}
        </div>
      </Cabinet>
      {snapshot.status === "finished" && snapshot.opponentRequested && !snapshot.youRequested ? (
        <p className="mt-3 text-center text-sm text-muted">L&apos;altro giocatore vuole la rivincita.</p>
      ) : null}
    </section>
  );
}

function TrisBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (snapshot.gameSlug !== "tris" || !("winningLine" in snapshot.state)) {
    return null;
  }
  const state = snapshot.state;
  const mine = snapshot.yourSeat === state.turn && snapshot.status === "playing";
  return (
    <form action={action} className="mx-auto grid max-w-sm grid-cols-3 gap-3 rounded-3xl border border-[#1d4c63] bg-[#041018] p-3 shadow-[inset_0_0_24px_rgb(0_0_0_/_0.45)]">
      <input type="hidden" name="matchId" value={snapshot.matchId} />
      {state.board.map((cell, index) => {
        const winning = state.winningLine?.includes(index) ?? false;
        return (
          <button
            key={index}
            type="submit"
            name="cell"
            value={index}
            disabled={!mine || cell !== null || pending}
            aria-label={`Riga ${Math.floor(index / 3) + 1}, colonna ${(index % 3) + 1}${cell ? `, ${cell}` : ", vuota"}`}
            className={`flex aspect-square items-center justify-center rounded-2xl border transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white enabled:hover:scale-[1.04] enabled:active:scale-95 disabled:cursor-not-allowed ${winning ? "play-win border-[#9ff7e4] bg-[#123044]" : "border-[#1d4c63] bg-[#0a1c2a] enabled:hover:border-[#9ff7e4]"}`}
          >
            <TicMark mark={cell} />
          </button>
        );
      })}
    </form>
  );
}

function ConnectFourBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (snapshot.gameSlug !== "forza-4" || !("columns" in snapshot.state)) {
    return null;
  }
  const state = snapshot.state;
  const mine = snapshot.yourSeat === state.turn && snapshot.status === "playing";
  return (
    <form
      action={action}
      className="mx-auto grid max-w-md grid-cols-7 gap-2 overflow-hidden rounded-3xl border border-[#0a2748] bg-[#16325c] p-3 shadow-[inset_0_0_20px_rgb(0_0_0_/_0.35)]"
    >
      <input type="hidden" name="matchId" value={snapshot.matchId} />
      {state.columns.map((column, index) => {
        const full = column.every((cell) => cell !== null);
        const playable = mine && !pending && !full;
        const stacked = column
          .map((cell) => (cell === "red" ? "Rosso" : cell === "yellow" ? "Giallo" : "vuota"))
          .join(", ");
        return (
          <button
            key={index}
            type="submit"
            name="column"
            value={index}
            disabled={!playable}
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
    </form>
  );
}

function RpsBoard({
  snapshot,
  action,
  pending,
}: {
  snapshot: MatchSnapshot;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  if (snapshot.gameSlug !== "morra-cinese" || !("choices" in snapshot.state)) {
    return null;
  }
  const state = snapshot.state;
  const own = snapshot.yourSeat === "B" ? state.choices.B : state.choices.A;
  const choosing = state.status === "choosing" && snapshot.status === "playing";
  return (
    <div>
      <div className="arcade-score" aria-hidden="true">
        <span>A {state.scores.A}</span>
        <span>B {state.scores.B}</span>
      </div>
      {state.lastRound ? (
        <div className="arcade-round mt-3" aria-hidden="true">
          <span className={state.lastRound.winner === "A" ? "arcade-round-win" : "inline-flex"}>
            {state.lastRound.winner === "A" ? <CrownIcon /> : null}
            {state.lastRound.hands.A ? (
              <HandMark hand={state.lastRound.hands.A} />
            ) : (
              <TimerIcon />
            )}
          </span>
          <span className="arcade-letter">{state.lastRound.winner === "draw" ? "=" : "·"}</span>
          <span className={state.lastRound.winner === "B" ? "arcade-round-win" : "inline-flex"}>
            {state.lastRound.winner === "B" ? <CrownIcon /> : null}
            {state.lastRound.hands.B ? (
              <HandMark hand={state.lastRound.hands.B} />
            ) : (
              <TimerIcon />
            )}
          </span>
        </div>
      ) : null}
      <p className="sr-only">
        {own ? `Hai scelto ${HAND_LABEL[own]}.` : "Non hai ancora scelto."}
      </p>
      {own ? (
        <div className="arcade-hud mt-3" aria-hidden="true">
          <HandMark hand={own} className="h-10 w-10" />
        </div>
      ) : null}
      <form action={action} className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <input type="hidden" name="matchId" value={snapshot.matchId} />
        {RPS_HANDS.map((hand) => (
          <Button
            key={hand}
            type="submit"
            name="hand"
            value={hand}
            data-hand={hand}
            disabled={!choosing || own !== null || pending}
            aria-label={HAND_LABEL[hand]}
            className="arcade-hand arcade-icon-btn"
          >
            <HandMark hand={hand} className="h-16 w-16" />
          </Button>
        ))}
      </form>
      <RpsGestureCredit />
    </div>
  );
}

function TurnPiece({ snapshot }: { snapshot: MatchSnapshot }) {
  if (snapshot.result === "draw") {
    return (
      <div className="arcade-hud" aria-hidden="true">
        <span className="arcade-letter">=</span>
      </div>
    );
  }
  if (snapshot.result !== "playing" && snapshot.winnerSeat) {
    return (
      <div className="arcade-hud" aria-hidden="true">
        <CrownIcon />
        <SeatPiece seat={snapshot.winnerSeat} />
      </div>
    );
  }
  const turn = "turn" in snapshot.state ? snapshot.state.turn : null;
  if (!turn) {
    return null;
  }
  return (
    <div className="arcade-hud" aria-hidden="true">
      <SeatPiece seat={turn} />
    </div>
  );
}

function SeatPiece({ seat }: { seat: string }) {
  if (seat === "X" || seat === "O") {
    return (
      <span className="arcade-hud-piece">
        <TicMark mark={seat} className="play-mark h-full w-full" />
      </span>
    );
  }
  if (seat === "red" || seat === "yellow") {
    return (
      <span className="arcade-hud-piece">
        <Disc color={seat} />
      </span>
    );
  }
  if (seat === "black" || seat === "white") {
    return (
      <span className="arcade-hud-piece">
        <span className={`block h-[78%] w-[78%] rounded-full ${seat === "black" ? "bg-[#111]" : "bg-[#f4f7fb]"}`} />
      </span>
    );
  }
  return <span className="arcade-letter">{seat}</span>;
}

function headline(snapshot: MatchSnapshot): string {
  const winner = nicknameForSeat(snapshot.players, snapshot.winnerSeat);
  if (snapshot.result === "draw") {
    return "Pareggio.";
  }
  if (snapshot.result === "timeout") {
    return `Tempo scaduto. Vince ${winner}.`;
  }
  if (snapshot.result === "abandoned") {
    return `${winner} vince: l'altro ha abbandonato.`;
  }
  if (snapshot.result === "won") {
    return `Vince ${winner}.`;
  }
  if (snapshot.gameSlug === "morra-cinese") {
    return "Scegliete insieme, senza vedere la mano dell'altro.";
  }
  const turn = "turn" in snapshot.state ? snapshot.state.turn : snapshot.yourSeat;
  return `Tocca a ${nicknameForSeat(snapshot.players, turn)} (${SEAT_LABEL[turn] ?? turn}).`;
}

function firstNotice(...results: Array<MatchResult | null>): string | null {
  for (const result of results) {
    if (result && !result.ok) {
      if (result.reason === "invalid_move" && result.detail) {
        return moveDetailMessage[result.detail];
      }
      return matchFailureMessage[result.reason];
    }
  }
  return null;
}
