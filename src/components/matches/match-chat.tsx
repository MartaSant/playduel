"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { readMatchChatAction, sendMatchChatAction } from "@/server/actions/chat";
import type { ChatMessage } from "@/lib/matches/chat";
import { Button } from "@/components/ui/button";

const CHAT_MESSAGE: Record<string, string> = {
  unauthenticated: "Per scrivere salva un nickname.",
  profile_required: "Per scrivere salva un nickname.",
  not_found: "Questa partita non esiste.",
  forbidden: "Non fai parte di questa partita.",
  invalid_message: "Il messaggio deve stare in 200 caratteri.",
  rate_limited: "Troppi messaggi. Aspetta un momento.",
  banned: "Questo profilo è sospeso fino al termine del provvedimento.",
  "missing-config": "Manca la configurazione Supabase.",
  unavailable: "La chat non è pronta. Esegui la migrazione SQL della chat e riprova.",
};

export function MatchChat({ matchId }: { matchId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [sent, send, pending] = useActionState(sendMatchChatAction, null);
  const listRef = useRef<HTMLUListElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      const result = await readMatchChatAction(matchId);
      if (stop) {
        return;
      }
      if (result.ok) {
        setMessages(result.messages);
        setReadError(null);
      } else {
        setReadError(CHAT_MESSAGE[result.reason]);
      }
    }
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 2000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [matchId]);

  useEffect(() => {
    if (!sent?.ok) {
      return;
    }
    setMessages(sent.messages);
    formRef.current?.reset();
  }, [sent]);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const alert = sent && !sent.ok ? CHAT_MESSAGE[sent.reason] : readError;

  return (
    <section className="arcade-note mx-auto mt-4 max-w-xl" aria-label="Chat">
      <h2 className="text-sm font-semibold">Chat</h2>
      <ul ref={listRef} className="arcade-chat" aria-live="polite">
        {messages.map((message) => (
          <li key={message.id} data-you={message.isYou ? "true" : "false"}>
            <span>{message.isYou ? "Tu" : message.nickname}</span>
            <p>{message.body}</p>
          </li>
        ))}
      </ul>
      <form ref={formRef} action={send} className="mt-3 flex gap-2">
        <input type="hidden" name="matchId" value={matchId} />
        <label className="sr-only" htmlFor={`chat-${matchId}`}>
          Messaggio
        </label>
        <input
          id={`chat-${matchId}`}
          name="body"
          maxLength={200}
          required
          autoComplete="off"
          placeholder="Scrivi all'altro giocatore"
          className="arcade-field min-w-0 flex-1 rounded-full border px-4 py-3"
        />
        <Button type="submit" className="arcade-coin" disabled={pending}>
          Invia
        </Button>
      </form>
      {alert ? (
        <p role="alert" className="mt-2 text-sm">
          {alert}
        </p>
      ) : null}
    </section>
  );
}
