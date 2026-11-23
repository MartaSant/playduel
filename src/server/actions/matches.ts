"use server";

import { redirect } from "next/navigation";
import { getGame } from "@/lib/games";
import { isMatchId, type MatchResult } from "@/lib/matches/rules";
import {
  abandonMatch,
  cancelQueue,
  enqueue,
  playMove,
  requestRematch,
} from "@/server/services/matches";
import { noteAccess } from "@/server/services/access";

export async function enqueueAction(
  _previous: MatchResult | null,
  formData: FormData,
): Promise<MatchResult> {
  const slug = text(formData, "game");
  if (!getGame(slug)) {
    return { ok: false, reason: "invalid_game" };
  }
  const result = await enqueue(slug);
  if (result.ok) {
    await noteAccess("enqueue", { game: slug });
  }
  if (result.ok && "matchId" in result) {
    redirect(`/match/${result.matchId}`);
  }
  return result;
}

export async function cancelQueueAction(
  _previous: MatchResult | null,
  formData: FormData,
): Promise<MatchResult> {
  const slug = text(formData, "game");
  if (!getGame(slug)) {
    return { ok: false, reason: "invalid_game" };
  }
  return cancelQueue(slug);
}

export async function playMoveAction(
  _previous: MatchResult | null,
  formData: FormData,
): Promise<MatchResult> {
  const matchId = text(formData, "matchId");
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  const cell = integer(formData, "cell");
  if (cell !== null) {
    return finishPlay(matchId, { cell });
  }
  const column = integer(formData, "column");
  if (column !== null) {
    return finishPlay(matchId, { column });
  }
  const hand = text(formData, "hand");
  if (hand === "rock" || hand === "paper" || hand === "scissors") {
    return finishPlay(matchId, { hand });
  }
  const edge = text(formData, "edge");
  if (edge !== null && /^[hv](?:1[01]|[0-9])$/.test(edge)) {
    return finishPlay(matchId, { edge });
  }
  const pile = integer(formData, "pile");
  const take = integer(formData, "take");
  if (pile !== null && take !== null) {
    return finishPlay(matchId, { pile, take });
  }
  const from = integer(formData, "from");
  const to = integer(formData, "to");
  if (from !== null && to !== null) {
    return finishPlay(matchId, { from, to });
  }
  return { ok: false, reason: "invalid_move" };
}

async function finishPlay(
  matchId: string,
  intent:
    | { cell: number }
    | { column: number }
    | { hand: string }
    | { edge: string }
    | { pile: number; take: number }
    | { from: number; to: number },
): Promise<MatchResult> {
  const result = await playMove(matchId, intent);
  if (result.ok) {
    await noteAccess("play", { matchId });
  }
  return result;
}

export async function abandonMatchAction(
  _previous: MatchResult | null,
  formData: FormData,
): Promise<MatchResult> {
  const matchId = text(formData, "matchId");
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  const result = await abandonMatch(matchId);
  if (result.ok) {
    await noteAccess("abandon", { matchId });
  }
  return result;
}

export async function rematchAction(
  _previous: MatchResult | null,
  formData: FormData,
): Promise<MatchResult> {
  const matchId = text(formData, "matchId");
  if (!isMatchId(matchId)) {
    return { ok: false, reason: "not_found" };
  }
  const result = await requestRematch(matchId);
  if (result.ok && "matchId" in result && result.matchId !== matchId) {
    redirect(`/match/${result.matchId}`);
  }
  return result;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function integer(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!/^\d+$/.test(value)) {
    return null;
  }
  return Number(value);
}
