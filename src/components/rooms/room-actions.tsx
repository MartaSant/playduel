"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  joinRoomAction,
  leaveRoomAction,
} from "@/server/actions/rooms";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { roomFailureMessage } from "@/lib/rooms/messages";
import type { RoomResult } from "@/lib/rooms/rules";
import { Button } from "@/components/ui/button";

type RoomActionsProps = {
  code: string;
  roomId: string | null;
  mode: "join" | "leave";
};

export function RoomActions({ code, roomId, mode }: RoomActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const action = mode === "join" ? joinRoomAction : leaveRoomAction;
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      return;
    }
    const refresh = () => router.refresh();
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${roomId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        refresh,
      )
      .subscribe();
    const interval = window.setInterval(refresh, 3000);
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [roomId, router]);

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const link = `${window.location.origin}/room/${code}`;
            void navigator.clipboard.writeText(link).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? "Link copiato" : "Copia link"}
        </Button>
        <form action={formAction}>
          <input type="hidden" name="code" value={code} />
          <Button type="submit" className="arcade-coin" disabled={pending}>
            {mode === "join" ? "Entra" : "Esci"}
          </Button>
        </form>
      </div>
      <RoomNotice state={state} code={code} />
    </div>
  );
}

function RoomNotice({
  state,
  code,
}: {
  state: RoomResult | null;
  code: string;
}) {
  if (!state || state.ok) {
    return null;
  }
  const needsProfile =
    state.reason === "profile_required" || state.reason === "unauthenticated";
  return (
    <p role="alert" className="text-sm text-foreground">
      {roomFailureMessage[state.reason]}{" "}
      {needsProfile ? (
        <Link
          href={`/profile?next=/room/${code}`}
          className="underline underline-offset-4"
        >
          Vai al profilo
        </Link>
      ) : null}
    </p>
  );
}
