"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createRoomAction } from "@/server/actions/rooms";
import { roomFailureMessage } from "@/lib/rooms/messages";
import { Button } from "@/components/ui/button";

type CreateRoomFormProps = {
  gameSlug: string;
};

export function CreateRoomForm({ gameSlug }: CreateRoomFormProps) {
  const [state, action, pending] = useActionState(createRoomAction, null);
  const needsProfile =
    state &&
    !state.ok &&
    (state.reason === "profile_required" || state.reason === "unauthenticated");

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="game" value={gameSlug} />
      <Button type="submit" className="arcade-coin" disabled={pending}>
        {pending ? "Creazione…" : "Crea stanza privata"}
      </Button>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-foreground">
          {roomFailureMessage[state.reason]}{" "}
          {needsProfile ? (
            <Link href="/profile" className="underline underline-offset-4">
              Vai al profilo
            </Link>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
