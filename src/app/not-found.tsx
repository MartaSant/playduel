import { Cabinet } from "@/components/games/cabinet";
import { GamesIcon } from "@/components/games/icons";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16">
      <Cabinet
        title="404"
        kicker={
          <>
            <span className="sr-only">Pagina non trovata</span>
            <GamesIcon />
          </>
        }
        deck={
          <ButtonLink href="/" className="arcade-coin">
            Home
          </ButtonLink>
        }
      >
        <p className="arcade-copy">
          Questo indirizzo non corrisponde a una pagina di PlayDuel.
        </p>
      </Cabinet>
    </main>
  );
}
