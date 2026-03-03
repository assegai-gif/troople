import { NextResponse } from "next/server";
import { getDailyAnswer, getUtcDateString, MAX_GUESSES } from "@/lib/game";
import { readCountryData } from "@/lib/data";

export async function GET() {
  const data = readCountryData();
  const date = getUtcDateString();
  const answer = getDailyAnswer(data.countries, date);

  return NextResponse.json({
    gameName: "Troople",
    date,
    maxGuesses: MAX_GUESSES,
    hintTroops: answer.troops,
    updatedAt: data.updatedAt,
    source: data.source,
    puzzleKey: `${date}:${answer.name.length}`,
    countries: data.countries.map((country) => country.name)
  });
}
