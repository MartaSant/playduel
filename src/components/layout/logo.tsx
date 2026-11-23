import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-8 w-8"
      >
        <rect width="32" height="32" rx="8" fill="#1a2140" />
        <path
          d="M9 22 V10 h5.2 a4.2 4.2 0 0 1 0 8.4 H9"
          fill="none"
          stroke="#7c6bff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M18 10 h5.2 L18 22 h5.2"
          fill="none"
          stroke="#3d8bfd"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span>PlayDuel</span>
    </Link>
  );
}
