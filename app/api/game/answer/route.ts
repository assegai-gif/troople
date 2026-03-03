import { NextResponse } from "next/server";
import { getDailyAnswer, getUtcDateString } from "@/lib/game";
import { readCountryData } from "@/lib/data";

export async function GET() {
  const data = readCountryData();
  const answer = getDailyAnswer(data.countries, getUtcDateString());

  return NextResponse.json({ answer: answer.name, troops: answer.troops });
}
