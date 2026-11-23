import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button-link";

type LocalMatchProps = {
  title: string;
  children: ReactNode;
};

export function LocalMatch({ title, children }: LocalMatchProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-medium text-accent-2">Partita locale</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">
        Due giocatori sullo stesso dispositivo. Ogni mossa viene accettata o
        rifiutata dal motore delle regole.
      </p>
      <div className="mt-8">{children}</div>
      <div className="mt-8">
        <ButtonLink href="/games" variant="secondary">
          Torna ai giochi
        </ButtonLink>
      </div>
    </main>
  );
}
