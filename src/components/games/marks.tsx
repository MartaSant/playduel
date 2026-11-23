export function TicMark({
  mark,
  className = "play-mark h-3/5 w-3/5",
}: {
  mark: "X" | "O" | null;
  className?: string;
}) {
  if (mark === "X") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
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
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="16" fill="none" stroke="#eef3ff" strokeWidth="8" />
      </svg>
    );
  }
  return null;
}

export function Disc({
  color,
  drop = false,
}: {
  color: "red" | "yellow" | null;
  drop?: boolean;
}) {
  if (!color) {
    return <span aria-hidden="true" className="block h-[78%] w-[78%] rounded-full bg-black/25" />;
  }
  return (
    <span
      aria-hidden="true"
      className={`block h-[78%] w-[78%] rounded-full shadow-[inset_0_-5px_0_rgb(0_0_0_/_0.28)] ${drop ? "play-drop" : ""} ${color === "red" ? "bg-[#e23b4a]" : "bg-[#f2c14e]"}`}
    />
  );
}

const HAND_SRC = {
  rock: "/rps/rock.png",
  paper: "/rps/paper.png",
  scissors: "/rps/scissors.png",
} as const;

export function HandMark({
  hand,
  className = "h-8 w-8",
}: {
  hand: "rock" | "paper" | "scissors";
  className?: string;
}) {
  return (
    <img
      src={HAND_SRC[hand]}
      alt=""
      aria-hidden="true"
      width={500}
      height={500}
      draggable={false}
      className={`aspect-square object-contain ${className}`}
    />
  );
}

export function RpsGestureCredit() {
  return (
    <p className="arcade-hint text-center">
      <a
        className="underline underline-offset-2"
        href="https://commons.wikimedia.org/wiki/Category:Rock_Paper_Scissors"
        rel="noreferrer"
        target="_blank"
      >
        Gesti
      </a>{" "}
      di Sertion, da foto di Fluff,{" "}
      <a
        className="underline underline-offset-2"
        href="https://creativecommons.org/licenses/by-sa/3.0/deed.it"
        rel="noreferrer"
        target="_blank"
      >
        CC BY-SA 3.0
      </a>.
    </p>
  );
}
