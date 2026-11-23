/**
 * Provisional match rule for the local MVP:
 * best of 3 rounds, and the match also ends as soon as a player reaches 2
 * round wins. After 3 rounds the higher score wins; a tied score is a draw.
 * A round is resolved only when both hands exist. While choosing, the
 * opponent's hand stays hidden. If the 30s deadline passes with one hand
 * missing, that player loses the round. If neither has chosen, the round
 * restarts. Abandon gives the match to the other player.
 */
export const RPS_HANDS = ["rock", "paper", "scissors"] as const;
export type RpsHand = (typeof RPS_HANDS)[number];
export const RPS_PLAYERS = ["A", "B"] as const;
export type RpsPlayer = (typeof RPS_PLAYERS)[number];
export type RpsRoundWinner = RpsPlayer | "draw";
export type RpsStatus = "choosing" | "revealed" | "won" | "draw";

export const RPS_WINS_NEEDED = 2;
export const RPS_MAX_ROUNDS = 3;
export const RPS_ROUND_TIMEOUT_MS = 30_000;

export type RpsState = {
  scores: { readonly A: number; readonly B: number };
  roundsPlayed: number;
  choices: { readonly A: RpsHand | null; readonly B: RpsHand | null };
  status: RpsStatus;
  winner: RpsPlayer | null;
  lastRound: {
    hands: { readonly A: RpsHand | null; readonly B: RpsHand | null };
    winner: RpsRoundWinner;
  } | null;
  deadlineAt: number | null;
};

export type RpsRejection =
  | "invalid-hand"
  | "finished"
  | "not-choosing"
  | "already-chosen";

export type RpsAction =
  | { ok: true; state: RpsState }
  | { ok: false; reason: RpsRejection | "not-revealed" | "too-early" };

export type RpsTimeout =
  | { ok: true; state: RpsState; effect: "reset-round" | "round-resolved" }
  | { ok: false; reason: "too-early" | "finished" | "not-choosing" };

export function createRockPaperScissors(now?: number): RpsState {
  return {
    scores: { A: 0, B: 0 },
    roundsPlayed: 0,
    choices: { A: null, B: null },
    status: "choosing",
    winner: null,
    lastRound: null,
    deadlineAt: now === undefined ? null : now + RPS_ROUND_TIMEOUT_MS,
  };
}

export function armRound(state: RpsState, now: number): RpsAction {
  if (state.status !== "choosing" || state.deadlineAt !== null) {
    return { ok: false, reason: "not-choosing" };
  }
  return {
    ok: true,
    state: { ...state, deadlineAt: now + RPS_ROUND_TIMEOUT_MS },
  };
}

export function chooseHand(
  state: RpsState,
  player: RpsPlayer,
  hand: string,
): RpsAction {
  if (!isHand(hand)) {
    return { ok: false, reason: "invalid-hand" };
  }
  if (state.status === "won" || state.status === "draw") {
    return { ok: false, reason: "finished" };
  }
  if (state.status !== "choosing") {
    return { ok: false, reason: "not-choosing" };
  }
  if (state.choices[player] !== null) {
    return { ok: false, reason: "already-chosen" };
  }

  const choices = { ...state.choices, [player]: hand };
  if (choices.A === null || choices.B === null) {
    return { ok: true, state: { ...state, choices } };
  }

  return {
    ok: true,
    state: resolveRound(state, { A: choices.A, B: choices.B }),
  };
}

export function continueMatch(state: RpsState, now: number): RpsAction {
  if (state.status !== "revealed") {
    return { ok: false, reason: "not-revealed" };
  }
  return {
    ok: true,
    state: {
      ...state,
      choices: { A: null, B: null },
      status: "choosing",
      deadlineAt: now + RPS_ROUND_TIMEOUT_MS,
    },
  };
}

export function applyTimeout(state: RpsState, now: number): RpsTimeout {
  if (state.status === "won" || state.status === "draw") {
    return { ok: false, reason: "finished" };
  }
  if (state.status !== "choosing") {
    return { ok: false, reason: "not-choosing" };
  }
  if (state.deadlineAt === null || now < state.deadlineAt) {
    return { ok: false, reason: "too-early" };
  }

  const { A, B } = state.choices;
  if (A === null && B === null) {
    return {
      ok: true,
      effect: "reset-round",
      state: {
        ...state,
        deadlineAt: now + RPS_ROUND_TIMEOUT_MS,
      },
    };
  }
  if (A !== null && B !== null) {
    return { ok: false, reason: "not-choosing" };
  }

  const winner: RpsPlayer = A !== null ? "A" : "B";
  return {
    ok: true,
    effect: "round-resolved",
    state: resolveRound(state, { A, B }, winner),
  };
}

export function abandonMatch(state: RpsState, player: RpsPlayer): RpsAction {
  if (state.status === "won" || state.status === "draw") {
    return { ok: false, reason: "finished" };
  }
  const winner: RpsPlayer = player === "A" ? "B" : "A";
  return {
    ok: true,
    state: {
      ...state,
      choices: { A: null, B: null },
      status: "won",
      winner,
    },
  };
}

export function handsFor(
  state: RpsState,
  viewer: RpsPlayer,
): { own: RpsHand | null; opponent: RpsHand | null } {
  const opponent: RpsPlayer = viewer === "A" ? "B" : "A";
  if (state.status === "choosing") {
    return { own: state.choices[viewer], opponent: null };
  }
  return {
    own: state.lastRound?.hands[viewer] ?? null,
    opponent: state.lastRound?.hands[opponent] ?? null,
  };
}

function resolveRound(
  state: RpsState,
  hands: { A: RpsHand | null; B: RpsHand | null },
  forcedWinner?: RpsPlayer,
): RpsState {
  const roundWinner =
    forcedWinner ??
    (hands.A !== null && hands.B !== null
      ? compareHands(hands.A, hands.B)
      : "draw");
  const scores = {
    A: state.scores.A + (roundWinner === "A" ? 1 : 0),
    B: state.scores.B + (roundWinner === "B" ? 1 : 0),
  };
  const roundsPlayed = state.roundsPlayed + 1;
  const next = {
    scores,
    roundsPlayed,
    choices: { A: null, B: null },
    lastRound: { hands, winner: roundWinner },
    deadlineAt: state.deadlineAt,
  };

  if (scores.A >= RPS_WINS_NEEDED || scores.B >= RPS_WINS_NEEDED) {
    return {
      ...next,
      status: "won",
      winner: scores.A >= RPS_WINS_NEEDED ? "A" : "B",
    };
  }
  if (roundsPlayed >= RPS_MAX_ROUNDS) {
    if (scores.A === scores.B) {
      return { ...next, status: "draw", winner: null };
    }
    return {
      ...next,
      status: "won",
      winner: scores.A > scores.B ? "A" : "B",
    };
  }
  return { ...next, status: "revealed", winner: null };
}

function isHand(value: string): value is RpsHand {
  return (RPS_HANDS as readonly string[]).includes(value);
}

function compareHands(left: RpsHand, right: RpsHand): RpsRoundWinner {
  if (left === right) {
    return "draw";
  }
  if (
    (left === "rock" && right === "scissors") ||
    (left === "scissors" && right === "paper") ||
    (left === "paper" && right === "rock")
  ) {
    return "A";
  }
  return "B";
}
