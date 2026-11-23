import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav aria-label="Principale">
          <ul className="flex items-center gap-1">
            <li>
              <Link
                href="/games"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Giochi
              </Link>
            </li>
            <li>
              <Link
                href="/profile"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Profilo
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
