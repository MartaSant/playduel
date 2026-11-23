import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { MatchPanel } from "@/components/matches/match-panel";
import { RoomActions } from "@/components/rooms/room-actions";
import { matchFailureMessage } from "@/lib/matches/messages";
import { getGame } from "@/lib/games";
import { roomStatusMessage } from "@/lib/rooms/messages";
import { isRoomCode, normalizeRoomCode } from "@/lib/rooms/rules";
import { ensureRoomMatch } from "@/server/services/matches";
import { readRoom } from "@/server/services/rooms";

export const metadata: Metadata = {
  title: "Stanza",
  description: "Stanza privata di PlayDuel.",
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-4 py-10">
          <p role="status" className="text-lg text-muted">
            Caricamento della stanza…
          </p>
        </main>
      }
    >
      <RoomScreen params={params} />
    </Suspense>
  );
}

async function RoomScreen({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) {
    notFound();
  }
  if (code !== normalized) {
    redirect(`/room/${normalized}`);
  }

  const room = await readRoom(normalized);
  if (!room.ok) {
    if (room.reason === "not_found" || room.reason === "invalid_code") {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Stanza</h1>
        <p role="alert" className="mt-4 max-w-xl text-lg text-muted">
          {room.reason === "unavailable"
            ? "Le stanze non sono pronte. Esegui la migrazione SQL delle stanze e riprova."
            : "Questa stanza non è disponibile."}
        </p>
      </main>
    );
  }

  const game = getGame(room.gameSlug);
  const seats = room.access === "member" ? room.players.length : room.seats;
  const match = room.access === "member" ? await ensureRoomMatch(room.code) : null;
  const board = match && match.ok && "state" in match ? match : null;
  const matchError =
    match && !match.ok && match.reason !== "not_ready" ? match : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-medium text-accent-2">
        {game?.name ?? "Gioco"} · codice {room.code}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Stanza privata
      </h1>
      <p role="status" className="mt-4 max-w-xl text-lg leading-8 text-muted">
        {roomStatusMessage(room.status, seats)}
      </p>
      {room.access === "member" ? (
        <ul className="mt-6 max-w-md divide-y divide-line rounded-2xl border border-line">
          {room.players.map((player) => (
            <li key={`${player.nickname}-${player.isYou ? "you" : "other"}`} className="px-4 py-3">
              <span className="font-semibold">{player.nickname}</span>
              <span className="text-muted">
                {player.isHost ? " · host" : ""}
                {player.isYou ? " · tu" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-muted">
          Posti occupati: {room.seats} di 2. I nickname compaiono dopo l&apos;ingresso.
        </p>
      )}
      {matchError ? (
        <p role="alert" className="mt-4 max-w-xl text-muted">
          {matchFailureMessage[matchError.reason]}
        </p>
      ) : null}
      {board ? (
        <MatchPanel key={`${board.matchId}-${board.version}`} snapshot={board} />
      ) : null}
      {room.status === "waiting" || room.status === "full" ? (
        <RoomActions
          code={room.code}
          roomId={room.access === "member" ? room.roomId : null}
          mode={room.access === "member" ? "leave" : "join"}
        />
      ) : null}
      <p className="mt-6 max-w-xl text-sm text-muted">
        La stanza scade dopo due ore. Esci chiude il posto; se esce l&apos;host,
        la stanza si chiude per entrambi.
      </p>
    </main>
  );
}
