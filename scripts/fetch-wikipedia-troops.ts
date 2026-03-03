import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

type CountryRecord = {
  name: string;
  troops: number;
  aliases?: string[];
};

const SOURCE_URL = "https://en.wikipedia.org/wiki/List_of_countries_by_number_of_military_and_paramilitary_personnel";

function cleanName(name: string): string {
  return name
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTroops(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeHeaderText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "TroopleBot/1.0 (data refresh for game)"
    }
  });

  if (!res.ok) {
    throw new Error(`Wikipedia fetch failed: ${res.status}`);
  }

  return await res.text();
}

function parseCountriesFromHtml(html: string): CountryRecord[] {
  const $ = cheerio.load(html);
  const countries: CountryRecord[] = [];
  const tables = $("table.wikitable");

  tables.each((_, table) => {
    const headerCells = $(table).find("tr").first().find("th");
    if (headerCells.length === 0) {
      return;
    }

    let countryIndex = -1;
    let activeIndex = -1;

    headerCells.each((index, cell) => {
      const header = normalizeHeaderText($(cell).text());

      if (countryIndex === -1 && (header.includes("country") || header.includes("state"))) {
        countryIndex = index;
      }

      if (activeIndex === -1 && header.includes("active")) {
        activeIndex = index;
      }
    });

    if (countryIndex === -1 || activeIndex === -1) {
      return;
    }

    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length === 0) {
          return;
        }

        const name = cleanName($(cells[countryIndex]).text());
        const activeTroopsRaw = $(cells[activeIndex]).text();
        const troops = parseTroops(activeTroopsRaw);

        if (!name || !troops) {
          return;
        }

        countries.push({ name, troops });
      });
  });

  // Remove duplicates by country name while preserving first parse.
  const deduped = Array.from(new Map(countries.map((c) => [c.name, c])).values());
  return deduped.sort((a, b) => a.name.localeCompare(b.name));
}

async function run() {
  const html = await fetchHtml(SOURCE_URL);
  const countries = parseCountriesFromHtml(html);

  if (countries.length < 120) {
    throw new Error(`Parsed dataset too small (${countries.length}). Aborting update.`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    source: SOURCE_URL,
    updatedAt: new Date().toISOString(),
    countries
  };

  const root = process.cwd();
  const latestPath = path.join(root, "data", "countries.latest.json");
  const snapshotPath = path.join(root, "data", "snapshots", `${today}.json`);

  fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2));

  console.log(`Saved ${countries.length} countries to ${latestPath}`);
  console.log(`Snapshot created: ${snapshotPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
