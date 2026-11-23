"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollToMatch({
  matchId,
  children,
}: {
  matchId: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const storageKey = `playduel-focus-${matchId}`;
    if (!node || sessionStorage.getItem(storageKey)) {
      return;
    }
    sessionStorage.setItem(storageKey, "1");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    const heading = node.querySelector("h1, h2");
    if (heading instanceof HTMLElement) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [matchId]);

  return (
    <div ref={ref} className="scroll-mt-24">
      {children}
    </div>
  );
}
