import fs from "node:fs";
import path from "node:path";
import type { CountryRecord } from "@/lib/types";

const DATA_PATH = path.join(process.cwd(), "data", "countries.latest.json");

type DataEnvelope = {
  source: string;
  updatedAt: string;
  countries: CountryRecord[];
};

export function readCountryData(): DataEnvelope {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const parsed = JSON.parse(raw) as DataEnvelope;

  if (!Array.isArray(parsed.countries) || parsed.countries.length === 0) {
    throw new Error("countries.latest.json is empty or invalid.");
  }

  return parsed;
}
