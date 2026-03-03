import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateGuess, findCountryByGuess, getDailyAnswer, getUtcDateString, MAX_GUESSES } from "@/lib/game";
import { readCountryData } from "@/lib/data";

const GuessSchema = z.object({
  guess: z.string().min(1),
  attempt: z.number().int().min(1).max(MAX_GUESSES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = GuessSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid guess payload." }, { status: 400 });
  }

  const data = readCountryData();
  const date = parsed.data.date ?? getUtcDateString();
  const answer = getDailyAnswer(data.countries, date);
  const guessCountry = findCountryByGuess(data.countries, parsed.data.guess);

  if (!guessCountry) {
    return NextResponse.json({ error: "Country is not in current dataset." }, { status: 404 });
  }

  const result = evaluateGuess(guessCountry, answer);
  const lost = parsed.data.attempt >= MAX_GUESSES && !result.correct;

  return NextResponse.json({
    ...result,
    guessesLeft: Math.max(0, MAX_GUESSES - parsed.data.attempt),
    gameOver: result.correct || lost,
    revealAnswer: lost ? answer.name : null
  });
}
