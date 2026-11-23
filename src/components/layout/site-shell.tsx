"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArcadeHeader } from "@/components/layout/arcade-header";
import { SiteHeader } from "@/components/layout/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const admin = path.startsWith("/admin");

  if (admin) {
    return (
      <>
        <SiteHeader />
        <div id="contenuto" className="flex flex-1 flex-col">
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      <ArcadeHeader />
      <div id="contenuto" className="site-arcade flex flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
