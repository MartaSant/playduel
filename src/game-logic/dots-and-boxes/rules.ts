export type DotsPlayer = "A" | "B";
export type DotsRejection = "finished" | "out-of-turn" | "invalid-edge" | "edge-taken";

export type DotsState = {
  horizontal: boolean[];
  vertical: boolean[];
  boxes: Array<DotsPlayer | null>;
  turn: DotsPlayer;
  status: "playing" | "won";
  winner: DotsPlayer | null;
};

export function createDots(): DotsState {
  return {
    horizontal: Array.from({ length: 12 }, () => false),
    vertical: Array.from({ length: 12 }, () => false),
    boxes: Array.from({ length: 9 }, () => null),
    turn: "A",
    status: "playing",
    winner: null,
  };
}

function boxEdges(box: number): { top: number; bottom: number; left: number; right: number } {
  const row = Math.floor(box / 3);
  const column = box % 3;
  return {
    top: row * 3 + column,
    bottom: (row + 1) * 3 + column,
    left: row * 4 + column,
    right: row * 4 + column + 1,
  };
}

export function playDots(
  state: DotsState,
  player: DotsPlayer,
  edge: string,
): { ok: true; state: DotsState } | { ok: false; reason: DotsRejection } {
  if (state.status !== "playing") {
    return { ok: false, reason: "finished" };
  }
  if (player !== state.turn) {
    return { ok: false, reason: "out-of-turn" };
  }
  const kind = edge[0];
  const index = Number(edge.slice(1));
  const horizontal = kind === "h";
  const vertical = kind === "v";
  if ((!horizontal && !vertical) || !Number.isInteger(index) || index < 0 || index > 11) {
    return { ok: false, reason: "invalid-edge" };
  }
  if ((horizontal ? state.horizontal : state.vertical)[index]) {
    return { ok: false, reason: "edge-taken" };
  }
  const nextHorizontal = state.horizontal.slice();
  const nextVertical = state.vertical.slice();
  if (horizontal) {
    nextHorizontal[index] = true;
  } else {
    nextVertical[index] = true;
  }
  const boxes = state.boxes.slice();
  let claimed = 0;
  for (let box = 0; box < 9; box += 1) {
    if (boxes[box] !== null) {
      continue;
    }
    const edges = boxEdges(box);
    const closed =
      nextHorizontal[edges.top] &&
      nextHorizontal[edges.bottom] &&
      nextVertical[edges.left] &&
      nextVertical[edges.right];
    if (closed) {
      boxes[box] = player;
      claimed += 1;
    }
  }
  const filled = nextHorizontal.every(Boolean) && nextVertical.every(Boolean);
  if (filled) {
    const scoreA = boxes.filter((owner) => owner === "A").length;
    const scoreB = boxes.filter((owner) => owner === "B").length;
    return {
      ok: true,
      state: {
        horizontal: nextHorizontal,
        vertical: nextVertical,
        boxes,
        turn: state.turn,
        status: "won",
        winner: scoreA >= scoreB ? "A" : "B",
      },
    };
  }
  return {
    ok: true,
    state: {
      horizontal: nextHorizontal,
      vertical: nextVertical,
      boxes,
      turn: claimed > 0 ? player : player === "A" ? "B" : "A",
      status: "playing",
      winner: null,
    },
  };
}
