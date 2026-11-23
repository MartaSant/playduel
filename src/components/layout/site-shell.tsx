"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArcadeHeader } from "@/components/layout/arcade-header";
import { SiteHeader } from "@/components/layout/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ArcadeFrame>{children}</ArcadeFrame>}>
      <ShellFrame>{children}</ShellFrame>
    </Suspense>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin")) {
    return (
      <>
        <SiteHeader />
        <div id="contenuto" className="flex flex-1 flex-col">
          {children}
        </div>
      </>
    );
  }
  return <ArcadeFrame>{children}</ArcadeFrame>;
}

function ArcadeFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <ArcadeHeader />
      <div id="contenuto" className="site-arcade flex flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
