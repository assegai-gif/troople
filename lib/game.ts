import crypto from "node:crypto";
import type { CountryRecord, GuessArrow, GuessResult } from "@/lib/types";

export const MAX_GUESSES = 6;

export function getUtcDateString(input?: Date): string {
  const date = input ?? new Date();
  return date.toISOString().slice(0, 10);
}

export function normalizeCountryName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashToInt(input: string): number {
  const digest = crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
  return Number.parseInt(digest, 16);
}

export function getDailyAnswer(countries: CountryRecord[], utcDateString: string): CountryRecord {
  if (countries.length === 0) {
    throw new Error("No countries available.");
  }

  const index = hashToInt(utcDateString) % countries.length;
  return countries[index];
}

export function findCountryByGuess(countries: CountryRecord[], rawGuess: string): CountryRecord | null {
  const query = normalizeCountryName(rawGuess);
  if (!query) {
    return null;
  }

  for (const country of countries) {
    if (normalizeCountryName(country.name) === query) {
      return country;
    }

    if (country.aliases?.some((alias) => normalizeCountryName(alias) === query)) {
      return country;
    }
  }

  return null;
}

export function evaluateGuess(guess: CountryRecord, answer: CountryRecord): GuessResult {
  const correct = normalizeCountryName(guess.name) === normalizeCountryName(answer.name);

  let arrow: GuessArrow = "none";
  if (!correct) {
    arrow = guess.troops < answer.troops ? "up" : "down";
  }

  return {
    guess: guess.name,
    guessedTroops: guess.troops,
    arrow,
    correct
  };
}
