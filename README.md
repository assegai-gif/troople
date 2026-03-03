# Troople

Troople is a daily shared browser game where players guess a country using troop-strength hints.

## Rules

- One puzzle per day (GMT/UTC).
- You get 6 guesses.
- A guess is only correct on exact country match.
- Wrong guesses show the guessed country's standing troop count and an arrow:
  - `↑` your guessed troop count is lower than the target.
  - `↓` your guessed troop count is higher than the target.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data refresh

Troop data comes from Wikipedia and is refreshed by GitHub Actions daily.

Run manually:

```bash
npm run fetch:data
```

If parsing fails or the row count is too low, the script exits non-zero and preserves the previous dataset.

## Deployment

1. Push to GitHub.
2. Import repo into Vercel.
3. Deploy on Hobby plan.
4. Keep GitHub Action enabled for daily data refresh.

## Attribution

Source dataset page:
- https://en.wikipedia.org/wiki/List_of_countries_by_number_of_military_and_paramilitary_personnel
