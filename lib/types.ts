export type CountryRecord = {
  name: string;
  troops: number;
  aliases?: string[];
};

export type GuessArrow = "up" | "down" | "none";

export type GuessResult = {
  guess: string;
  guessedTroops: number;
  arrow: GuessArrow;
  correct: boolean;
};
