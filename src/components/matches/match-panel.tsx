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
import { Disc, HandMark, TicMark } from "@/components/games/marks";
import { Button } from "@/components/ui/button";

const HAND_LABEL: Record<RpsHand, string> = {
  rock: "Sasso",
  paper: "Carta",
  scissors: "Forbici",
};

const SEAT_LABEL: Record<string, string> = {
  X: "X",
  O: "O",
  red: "Rosso",
  yellow: "Giallo",
  A: "A",
  B: "B",
};

export function MatchPanel({ snapshot }: { snapshot: MatchSnapshot }) {
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
    <section className="mt-8" aria-labelledby="partita-heading">
      <h2 id="partita-heading" className="text-2xl font-semibold tracking-tight">
        {headline(snapshot)}
      </h2>
      <p className="mt-2 text-muted">
        {snapshot.players
          .map(
            (player) =>
              `${player.nickname} (${SEAT_LABEL[player.seat] ?? player.seat})${player.isYou ? ", tu" : ""}`,
          )
          .join(" · ")}
      </p>
      {snapshot.status === "playing" && seconds !== null ? (
        <p className="mt-2 text-sm text-muted">Secondi rimasti: {seconds}</p>
      ) : null}
      {notice ? (
        <p role="alert" className="mt-3 text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      <div className="mt-6">
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
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {snapshot.status === "playing" ? (
          <form action={abandonForm}>
            <input type="hidden" name="matchId" value={snapshot.matchId} />
            <Button type="submit" variant="secondary" disabled={abandonPending}>
              Abbandona la partita
            </Button>
          </form>
        ) : (
          <form action={rematchForm}>
            <input type="hidden" name="matchId" value={snapshot.matchId} />
            <Button type="submit" disabled={rematchPending || snapshot.youRequested}>
              {snapshot.youRequested ? "Rivincita chiesta" : "Rivincita"}
            </Button>
          </form>
        )}
        <Link
          href="/games"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 font-semibold"
        >
          Torna ai giochi
        </Link>
      </div>
      {snapshot.players.length > 1 ? <ReportForm matchId={snapshot.matchId} /> : null}
      {snapshot.status === "finished" && snapshot.opponentRequested && !snapshot.youRequested ? (
        <p className="mt-3 text-sm text-muted">L&apos;altro giocatore vuole la rivincita.</p>
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
  if (snapshot.gameSlug !== "tris" || !("board" in snapshot.state)) {
    return null;
  }
  const state = snapshot.state;
  const mine = snapshot.yourSeat === state.turn && snapshot.status === "playing";
  return (
    <form action={action} className="grid max-w-sm grid-cols-3 gap-3 rounded-3xl border border-line bg-[#0c1224] p-3">
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
            className={`flex aspect-square items-center justify-center rounded-2xl border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed ${winning ? "border-accent-2 bg-accent/30" : "border-line bg-card enabled:hover:border-accent-2"}`}
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
    <div className="max-w-md rounded-3xl border border-line bg-[#16325c] p-3">
      <form action={action} className="grid grid-cols-7 gap-2">
        <input type="hidden" name="matchId" value={snapshot.matchId} />
        {state.columns.map((column, index) => (
          <button
            key={index}
            type="submit"
            name="column"
            value={index}
            disabled={!mine || pending || column.every((cell) => cell !== null)}
            aria-label={`Inserisci nella colonna ${index + 1}`}
            className="flex min-h-11 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="block h-6 w-6">
              <Disc
                color={
                  mine && !column.every((cell) => cell !== null) ? state.turn : null
                }
              />
            </span>
          </button>
        ))}
      </form>
      <div className="mt-2 grid grid-cols-7 gap-2">
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
                    ? `${disc === "red" ? "Rosso" : "Giallo"}, riga ${row + 1}, colonna ${columnIndex + 1}`
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
      <p className="text-muted">
        Punteggio {state.scores.A} — {state.scores.B}. Al meglio di 3, primo a 2.
        La mano dell&apos;altro resta nascosta finché non avete scelto entrambi.
      </p>
      {state.lastRound ? (
        <p className="mt-2 text-muted">
          Ultimo round: {labelHand(state.lastRound.hands.A)} contro{" "}
          {labelHand(state.lastRound.hands.B)}. Vince{" "}
          {state.lastRound.winner === "draw"
            ? "nessuno"
            : nicknameForSeat(snapshot.players, state.lastRound.winner)}
          .
        </p>
      ) : null}
      <p className="mt-3 font-semibold">
        {own ? `Hai scelto ${HAND_LABEL[own]}.` : "Non hai ancora scelto."}
      </p>
      <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input type="hidden" name="matchId" value={snapshot.matchId} />
        {RPS_HANDS.map((hand) => (
          <Button
            key={hand}
            type="submit"
            name="hand"
            value={hand}
            disabled={!choosing || own !== null || pending}
            className="min-w-28 flex-col gap-1 py-3"
          >
            <HandMark hand={hand} />
            {HAND_LABEL[hand]}
          </Button>
        ))}
      </form>
    </div>
  );
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

function labelHand(hand: RpsHand | null): string {
  return hand ? HAND_LABEL[hand] : "nessuna scelta";
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
