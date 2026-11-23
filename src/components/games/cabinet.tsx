import type { ReactNode } from "react";

type CabinetProps = {
  title: string;
  kicker: ReactNode;
  level?: "h1" | "h2";
  children: ReactNode;
  deck?: ReactNode;
};

export function Cabinet({
  title,
  kicker,
  level = "h1",
  children,
  deck,
}: CabinetProps) {
  const Title = level;
  return (
    <div className="arcade">
      <div className="arcade-cabinet">
        <header className="arcade-marquee">
          <span className="arcade-shine" aria-hidden="true" />
          <p className="arcade-kicker">{kicker}</p>
          <Title className="arcade-title">{title}</Title>
        </header>
        <div className="arcade-bezel">
          <div className="arcade-screen">
            {children}
            <span className="arcade-scan" aria-hidden="true" />
            <span className="arcade-glare" aria-hidden="true" />
          </div>
        </div>
        <div className="arcade-deck">
          <div className="arcade-speakers" aria-hidden="true">
            <span className="arcade-speaker" />
            <span className="arcade-speaker" />
          </div>
          <div className="arcade-stick" aria-hidden="true">
            <span className="arcade-stick-shaft" />
            <span className="arcade-stick-ball" />
          </div>
          <div className="arcade-controls">{deck}</div>
          <div className="arcade-lamps" aria-hidden="true">
            <span className="arcade-lamp arcade-lamp-red" />
            <span className="arcade-lamp arcade-lamp-amber" />
            <span className="arcade-lamp arcade-lamp-green" />
          </div>
        </div>
      </div>
    </div>
  );
}
