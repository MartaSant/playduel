export function TicMark({ mark }: { mark: "X" | "O" | null }) {
  if (mark === "X") {
    return (
      <svg viewBox="0 0 64 64" className="h-3/5 w-3/5" aria-hidden="true">
        <path
          d="M16 16 L48 48 M48 16 L16 48"
          fill="none"
          stroke="#8eb6ff"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (mark === "O") {
    return (
      <svg viewBox="0 0 64 64" className="h-3/5 w-3/5" aria-hidden="true">
        <circle cx="32" cy="32" r="16" fill="none" stroke="#eef3ff" strokeWidth="8" />
      </svg>
    );
  }
  return null;
}

export function Disc({
  color,
}: {
  color: "red" | "yellow" | null;
}) {
  if (!color) {
    return <span aria-hidden="true" className="block h-[78%] w-[78%] rounded-full bg-black/25" />;
  }
  return (
    <span
      aria-hidden="true"
      className={`block h-[78%] w-[78%] rounded-full shadow-[inset_0_-5px_0_rgb(0_0_0_/_0.28)] ${color === "red" ? "bg-[#e23b4a]" : "bg-[#f2c14e]"}`}
    />
  );
}

export function HandMark({ hand }: { hand: "rock" | "paper" | "scissors" }) {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      {hand === "rock" ? (
        <circle cx="32" cy="34" r="14" fill="currentColor" />
      ) : null}
      {hand === "paper" ? (
        <rect x="18" y="14" width="28" height="36" rx="4" fill="currentColor" />
      ) : null}
      {hand === "scissors" ? (
        <path
          d="M22 16 L42 48 M42 16 L22 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
