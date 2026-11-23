import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Cabinet } from "@/components/games/cabinet";
import { CoinIcon } from "@/components/games/icons";
import { MatchPanel } from "@/components/matches/match-panel";
import { MatchChat } from "@/components/matches/match-chat";
import { RoomActions } from "@/components/rooms/room-actions";
import { ScrollToMatch } from "@/components/rooms/scroll-to-match";
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
  const match =
    room.access === "member" && room.status === "full"
      ? await ensureRoomMatch(room.code)
      : null;
  const board = match && match.ok && "state" in match ? match : null;
  const matchError =
    match && !match.ok && match.reason !== "not_ready" ? match : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
      {board ? (
        <div className="match-layout">
          <ScrollToMatch matchId={board.matchId}>
            <MatchPanel
              key={`${board.matchId}-${board.version}`}
              snapshot={board}
              titleLevel="h1"
            />
          </ScrollToMatch>
          <MatchChat matchId={board.matchId} />
        </div>
      ) : (
        <Cabinet
          title={game?.name ?? "Stanza"}
          level="h1"
          kicker={
            <>
              <span className="sr-only">Codice {room.code}</span>
              <CoinIcon />
              <span>{room.code}</span>
            </>
          }
        >
          <p role="status" className="arcade-status">
            {roomStatusMessage(room.status, seats)}
          </p>
          {room.access === "member" ? (
            <ul className="arcade-players">
              {room.players.map((player) => (
                <li key={`${player.nickname}-${player.isYou ? "you" : "other"}`}>
                  <span>{player.nickname}</span>
                  {player.isHost ? <span aria-label="host">★</span> : null}
                  {player.isYou ? <span className="arcade-you" aria-label="tu" /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="arcade-hint">Posti {room.seats}/2</p>
          )}
          {matchError ? (
            <p role="alert" className="arcade-alert">
              {matchFailureMessage[matchError.reason]}
            </p>
          ) : null}
          <p className="arcade-hint">La stanza scade dopo due ore.</p>
        </Cabinet>
      )}
      {room.status === "waiting" || room.status === "full" ? (
        <div className="mx-auto mt-4 max-w-xl">
          <RoomActions
            code={room.code}
            roomId={room.access === "member" ? room.roomId : null}
            mode={room.access === "member" ? "leave" : "join"}
          />
        </div>
      ) : null}
    </main>
  );
}
