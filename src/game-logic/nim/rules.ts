export type NimPlayer = "A" | "B";
export type NimRejection = "finished" | "out-of-turn" | "invalid-pile" | "invalid-take";

export type NimState = {
  piles: [number, number, number];
  turn: NimPlayer;
  status: "playing" | "won";
  winner: NimPlayer | null;
};

export function createNim(): NimState {
  return { piles: [3, 5, 7], turn: "A", status: "playing", winner: null };
}

export function playNim(
  state: NimState,
  player: NimPlayer,
  pile: number,
  take: number,
): { ok: true; state: NimState } | { ok: false; reason: NimRejection } {
  if (state.status !== "playing") {
    return { ok: false, reason: "finished" };
  }
  if (player !== state.turn) {
    return { ok: false, reason: "out-of-turn" };
  }
  if (!Number.isInteger(pile) || pile < 0 || pile > 2) {
    return { ok: false, reason: "invalid-pile" };
  }
  const size = state.piles[pile];
  if (!Number.isInteger(take) || take < 1 || take > 3 || take > size) {
    return { ok: false, reason: "invalid-take" };
  }
  const piles: [number, number, number] = [state.piles[0], state.piles[1], state.piles[2]];
  piles[pile] = size - take;
  if (piles.every((count) => count === 0)) {
    return { ok: true, state: { piles, turn: state.turn, status: "won", winner: player } };
  }
  return {
    ok: true,
    state: {
      piles,
      turn: player === "A" ? "B" : "A",
      status: "playing",
      winner: null,
    },
  };
}
