import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Pagina non trovata</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        Questo indirizzo non corrisponde a una pagina di PlayDuel.
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Torna alla home</ButtonLink>
      </div>
    </main>
  );
}
