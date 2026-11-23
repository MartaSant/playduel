export const games = [
  {
    slug: "tris",
    name: "Tris",
    playersLabel: "2 giocatori",
    summary: "Griglia 3×3. Allinea tre simboli in riga, colonna o diagonale.",
  },
  {
    slug: "forza-4",
    name: "Forza 4",
    playersLabel: "2 giocatori",
    summary: "Sette colonne e sei righe. Il primo a quattro gettoni in fila vince.",
  },
  {
    slug: "morra-cinese",
    name: "Morra cinese",
    playersLabel: "2 giocatori",
    summary: "Sasso, carta o forbici, scelti insieme. L'avversario non vede la mano prima.",
  },
] as const;

export type Game = (typeof games)[number];
export type GameSlug = Game["slug"];
export const playModes = ["online", "stanza"] as const;
export type PlayMode = (typeof playModes)[number];

export function getGame(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function isPlayMode(value: string): value is PlayMode {
  return (playModes as readonly string[]).includes(value);
}

export function modeLabel(mode: PlayMode): string {
  return mode === "online" ? "Gioca online" : "Stanza privata";
}
