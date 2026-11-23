import assert from "node:assert/strict";
import test from "node:test";
import {
  abandonMatch,
  applyTimeout,
  chooseHand,
  continueMatch,
  createRockPaperScissors,
  handsFor,
  RPS_ROUND_TIMEOUT_MS,
  type RpsState,
} from "./rules.ts";

const START = 1_000;

function chooseBoth(
  state: RpsState,
  hands: { A: "rock" | "paper" | "scissors"; B: "rock" | "paper" | "scissors" },
): RpsState {
  const first = chooseHand(state, "A", hands.A);
  assert.equal(first.ok, true);
  if (!first.ok) {
    return state;
  }
  assert.equal(handsFor(first.state, "B").opponent, null);
  const second = chooseHand(first.state, "B", hands.B);
  assert.equal(second.ok, true);
  if (!second.ok) {
    return state;
  }
  return second.state;
}

test("a round stays hidden until both hands are in", () => {
  const start = createRockPaperScissors(START);
  const first = chooseHand(start, "A", "rock");
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  assert.equal(first.state.status, "choosing");
  assert.equal(handsFor(first.state, "A").own, "rock");
  assert.equal(handsFor(first.state, "B").opponent, null);
  assert.equal(handsFor(first.state, "A").opponent, null);

  const resolved = chooseBoth(start, { A: "rock", B: "scissors" });
  assert.equal(resolved.status, "revealed");
  assert.equal(resolved.scores.A, 1);
  assert.equal(handsFor(resolved, "A").opponent, "scissors");
});

test("paper covers rock, scissors cut paper, matching hands draw", () => {
  const paper = chooseBoth(createRockPaperScissors(START), {
    A: "paper",
    B: "rock",
  });
  assert.equal(paper.lastRound?.winner, "A");

  const scissors = chooseBoth(createRockPaperScissors(START), {
    A: "scissors",
    B: "paper",
  });
  assert.equal(scissors.lastRound?.winner, "A");

  const draw = chooseBoth(createRockPaperScissors(START), {
    A: "rock",
    B: "rock",
  });
  assert.equal(draw.lastRound?.winner, "draw");
  assert.deepEqual(draw.scores, { A: 0, B: 0 });
  assert.equal(draw.roundsPlayed, 1);
  assert.equal(draw.status, "revealed");
});

test("the match ends at two wins, or after three rounds on the higher score", () => {
  let state = createRockPaperScissors(START);
  state = chooseBoth(state, { A: "rock", B: "scissors" });
  const continued = continueMatch(state, START + 10);
  assert.equal(continued.ok, true);
  if (!continued.ok) {
    return;
  }
  state = chooseBoth(continued.state, { A: "paper", B: "rock" });
  assert.equal(state.status, "won");
  assert.equal(state.winner, "A");
  assert.equal(continueMatch(state, START).ok, false);

  let tied = createRockPaperScissors(START);
  tied = chooseBoth(tied, { A: "rock", B: "scissors" });
  const next = continueMatch(tied, START);
  assert.equal(next.ok, true);
  if (!next.ok) {
    return;
  }
  tied = chooseBoth(next.state, { A: "rock", B: "paper" });
  const last = continueMatch(tied, START);
  assert.equal(last.ok, true);
  if (!last.ok) {
    return;
  }
  tied = chooseBoth(last.state, { A: "rock", B: "rock" });
  assert.equal(tied.status, "draw");
  assert.deepEqual(tied.scores, { A: 1, B: 1 });

  let lead = createRockPaperScissors(START);
  lead = chooseBoth(lead, { A: "rock", B: "scissors" });
  const second = continueMatch(lead, START);
  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }
  lead = chooseBoth(second.state, { A: "rock", B: "rock" });
  const third = continueMatch(lead, START);
  assert.equal(third.ok, true);
  if (!third.ok) {
    return;
  }
  lead = chooseBoth(third.state, { A: "rock", B: "rock" });
  assert.equal(lead.status, "won");
  assert.equal(lead.winner, "A");
  assert.equal(lead.scores.A, 1);
});

test("rejects a second choice, a bad hand and a move after the match", () => {
  const start = createRockPaperScissors(START);
  const first = chooseHand(start, "A", "rock");
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  assert.deepEqual(chooseHand(first.state, "A", "paper"), {
    ok: false,
    reason: "already-chosen",
  });
  assert.deepEqual(chooseHand(start, "A", "lizard"), {
    ok: false,
    reason: "invalid-hand",
  });

  const revealed = chooseBoth(start, { A: "rock", B: "scissors" });
  assert.deepEqual(chooseHand(revealed, "A", "paper"), {
    ok: false,
    reason: "not-choosing",
  });
  const continued = continueMatch(revealed, START);
  assert.equal(continued.ok, true);
  if (!continued.ok) {
    return;
  }
  const won = chooseBoth(continued.state, { A: "rock", B: "scissors" });
  assert.equal(won.status, "won");
  assert.deepEqual(chooseHand(won, "A", "rock"), {
    ok: false,
    reason: "finished",
  });
});

test("timeout resets an empty round and awards a round when one hand is missing", () => {
  assert.equal(applyTimeout(createRockPaperScissors(), START).ok, false);
  const start = createRockPaperScissors(START);
  const deadline = START + RPS_ROUND_TIMEOUT_MS;
  assert.equal(start.deadlineAt, deadline);
  assert.deepEqual(applyTimeout(start, deadline - 1), {
    ok: false,
    reason: "too-early",
  });

  const reset = applyTimeout(start, deadline);
  assert.equal(reset.ok, true);
  if (reset.ok) {
    assert.equal(reset.effect, "reset-round");
    assert.equal(reset.state.roundsPlayed, 0);
    assert.equal(reset.state.deadlineAt, deadline + RPS_ROUND_TIMEOUT_MS);
  }

  const chosen = chooseHand(start, "B", "paper");
  assert.equal(chosen.ok, true);
  if (!chosen.ok) {
    return;
  }
  const awarded = applyTimeout(chosen.state, deadline);
  assert.equal(awarded.ok, true);
  if (awarded.ok) {
    assert.equal(awarded.effect, "round-resolved");
    assert.equal(awarded.state.scores.B, 1);
    assert.equal(awarded.state.lastRound?.hands.A, null);
    assert.equal(handsFor(awarded.state, "A").opponent, "paper");
  }
});

test("abandon hands the match to the other player", () => {
  const start = createRockPaperScissors(START);
  const left = abandonMatch(start, "A");
  assert.equal(left.ok, true);
  if (left.ok) {
    assert.equal(left.state.status, "won");
    assert.equal(left.state.winner, "B");
    assert.equal(abandonMatch(left.state, "B").ok, false);
  }

  const choosing = chooseHand(start, "A", "rock");
  assert.equal(choosing.ok, true);
  if (choosing.ok) {
    const gone = abandonMatch(choosing.state, "B");
    assert.equal(gone.ok, true);
    if (gone.ok) {
      assert.equal(gone.state.winner, "A");
      assert.equal(handsFor(gone.state, "B").opponent, null);
    }
  }
});
