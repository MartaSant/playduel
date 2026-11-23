"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { matchFailureMessage } from "@/lib/matches/messages";
import type { MatchResult } from "@/lib/matches/rules";
import { cancelQueueAction, enqueueAction } from "@/server/actions/matches";
import { Button } from "@/components/ui/button";

export function QueueForm({
  gameSlug,
  queue,
}: {
  gameSlug: string;
  queue: MatchResult;
}) {
  const router = useRouter();
  const [search, searchAction, searching] = useActionState(enqueueAction, null);
  const [cancelled, cancelAction, cancelling] = useActionState(
    cancelQueueAction,
    null,
  );
  const current = cancelled ?? search ?? queue;
  const waiting = current.ok && "access" in current && current.access === "waiting";

  useEffect(() => {
    if (!waiting) {
      return;
    }
    const interval = window.setInterval(() => router.refresh(), 2000);
    return () => window.clearInterval(interval);
  }, [router, waiting]);

  const needsProfile =
    !current.ok &&
    (current.reason === "profile_required" || current.reason === "unauthenticated");

  return (
    <div className="mt-8 flex max-w-md flex-col gap-3">
      {waiting ? (
        <form action={cancelAction}>
          <input type="hidden" name="game" value={gameSlug} />
          <p role="status" className="mb-3 text-lg text-muted">
            In attesa di un avversario. La ricerca scade dopo due minuti.
          </p>
          <Button type="submit" variant="secondary" disabled={cancelling}>
            Annulla la ricerca
          </Button>
        </form>
      ) : (
        <form action={searchAction}>
          <input type="hidden" name="game" value={gameSlug} />
          <Button type="submit" className="arcade-coin" disabled={searching}>
            {searching ? "Ricerca…" : "Cerca un avversario"}
          </Button>
        </form>
      )}
      {!current.ok ? (
        <p role="alert" className="text-sm text-foreground">
          {matchFailureMessage[current.reason]}{" "}
          {needsProfile ? (
            <Link href="/profile" className="underline underline-offset-4">
              Vai al profilo
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
