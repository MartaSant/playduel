import type { ReactNode } from "react";
import Link from "next/link";

const variants = {
  primary:
    "bg-accent text-white hover:bg-[#3426c4] focus-visible:outline-white",
  secondary:
    "border border-line bg-transparent text-foreground hover:bg-white/5 focus-visible:outline-white",
} as const;

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-center text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}
