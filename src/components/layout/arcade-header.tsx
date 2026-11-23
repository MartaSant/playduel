import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function ArcadeHeader() {
  return (
    <header className="arcade-bar">
      <div className="arcade-bar-inner">
        <Logo />
        <nav aria-label="Principale">
          <ul className="flex items-center gap-2">
            <li>
              <Link href="/games" className="arcade-nav">
                Giochi
              </Link>
            </li>
            <li>
              <Link href="/profile" className="arcade-nav">
                Profilo
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
