import type { ReactNode } from "react";
import { Cabinet } from "@/components/games/cabinet";
import { CoinIcon, GamesIcon } from "@/components/games/icons";
import { ButtonLink } from "@/components/ui/button-link";

type LocalMatchProps = {
  title: string;
  children: ReactNode;
};

export function LocalMatch({ title, children }: LocalMatchProps) {
  return (
    <main className="arcade-stage mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      <Cabinet
        title={title}
        kicker={
          <>
            <span className="sr-only">Partita locale</span>
            <CoinIcon />
          </>
        }
        deck={
          <ButtonLink
            href="/games"
            variant="secondary"
            label="Torna ai giochi"
            className="arcade-icon-btn"
          >
            <GamesIcon />
          </ButtonLink>
        }
      >
        {children}
      </Cabinet>
    </main>
  );
}
