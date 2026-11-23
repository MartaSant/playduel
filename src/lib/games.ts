export const games = [
  {
    slug: "tris",
    name: "Tris",
    playersLabel: "2 giocatori",
    summary: "Griglia 3×3. Allinea tre simboli in riga, colonna o diagonale.",
    cover: "/covers/tris.svg",
    coverCredit: "Pearson Scott Foresman, pubblico dominio",
  },
  {
    slug: "forza-4",
    name: "Forza 4",
    playersLabel: "2 giocatori",
    summary: "Sette colonne e sei righe. Il primo a quattro gettoni in fila vince.",
    cover: "/covers/forza-4.jpg",
    coverCredit: "FR, CC BY-SA 4.0, ritaglio quadrato",
  },
  {
    slug: "morra-cinese",
    name: "Morra cinese",
    playersLabel: "2 giocatori",
    summary: "Sasso, carta o forbici, scelti insieme. L'avversario non vede la mano prima.",
    cover: "/covers/morra-cinese.jpg",
    coverCredit: "Vix929, CC BY-SA 3.0",
  },
  {
    slug: "reversi",
    name: "Reversi",
    playersLabel: "2 giocatori",
    summary: "Otto per otto. Chiudi le pedine avversarie e resta con più dischi.",
    cover: "/covers/reversi.svg",
    coverCredit: "Copertina originale PlayDuel",
  },
  {
    slug: "punti-quadrati",
    name: "Punti e quadrati",
    playersLabel: "2 giocatori",
    summary: "Traccia un lato. Chi chiude un quadrato lo tiene e gioca ancora.",
    cover: "/covers/punti-quadrati.svg",
    coverCredit: "Copertina originale PlayDuel",
  },
  {
    slug: "tre-pile",
    name: "Le tre pile",
    playersLabel: "2 giocatori",
    summary: "Tre pile di pietre. Togli da una a tre pietre. Chi prende l'ultima vince.",
    cover: "/covers/tre-pile.svg",
    coverCredit: "Copertina originale PlayDuel",
  },
  {
    slug: "dama",
    name: "Dama",
    playersLabel: "2 giocatori",
    summary: "Otto per otto. Le pedine avanzano in diagonale e mangiano saltando. La presa è obbligatoria.",
    cover: "/covers/dama.svg",
    coverCredit: "Copertina originale PlayDuel",
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
