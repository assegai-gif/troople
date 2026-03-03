"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type GuessItem = {
  guess: string;
  guessedTroops: number;
  arrow: "up" | "down" | "none";
  correct: boolean;
};

type TodayResponse = {
  gameName: string;
  date: string;
  maxGuesses: number;
  updatedAt: string;
  source: string;
  countries: string[];
};

const ARROW_LABEL: Record<GuessItem["arrow"], string> = {
  up: "↑",
  down: "↓",
  none: "OK"
};

function storageKey(date: string): string {
  return `troople:${date}`;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [guesses, setGuesses] = useState<GuessItem[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const res = await fetch("/api/game/today", { cache: "no-store" });
        const payload = (await res.json()) as TodayResponse;
        if (!mounted) {
          return;
        }

        setToday(payload);

        const raw = localStorage.getItem(storageKey(payload.date));
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { guesses: GuessItem[]; answer: string | null };
            setGuesses(parsed.guesses ?? []);
            setAnswer(parsed.answer ?? null);
          } catch {
            localStorage.removeItem(storageKey(payload.date));
          }
        }
      } catch {
        setError("Could not load today's game.");
      } finally {
        setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const maxGuesses = today?.maxGuesses ?? 6;
  const usedGuesses = guesses.length;
  const hasWon = guesses.some((guess) => guess.correct);
  const hasLost = usedGuesses >= maxGuesses && !hasWon;
  const gameOver = hasWon || hasLost;

  useEffect(() => {
    if (!today) {
      return;
    }

    localStorage.setItem(storageKey(today.date), JSON.stringify({ guesses, answer }));
  }, [today, guesses, answer]);

  const countryOptions = useMemo(() => today?.countries ?? [], [today]);

  async function submitGuess(event: FormEvent) {
    event.preventDefault();

    if (!today || gameOver || !guessInput.trim()) {
      return;
    }

    setError(null);

    try {
      const attempt = guesses.length + 1;
      const res = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: guessInput.trim(), attempt, date: today.date })
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error ?? "Guess failed.");
      }

      const nextGuesses = [...guesses, payload as GuessItem];
      setGuesses(nextGuesses);
      setGuessInput("");

      if (payload.revealAnswer) {
        setAnswer(payload.revealAnswer as string);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guess failed.");
    }
  }

  return (
    <main>
      <section className="panel">
        <h1>Troople</h1>
        <p className="subtitle">Guess today's country from standing troop strength.</p>

        {loading && <p>Loading...</p>}

        {!loading && today && (
          <>
            <div className="meta" aria-live="polite">
              <span>Date (GMT): {today.date}</span>
              <span>Guesses left: {Math.max(0, maxGuesses - usedGuesses)}</span>
            </div>

            <form className="guessForm" onSubmit={submitGuess}>
              <label htmlFor="guess-input" className="sr-only">
                Country guess
              </label>
              <input
                id="guess-input"
                name="guess"
                type="text"
                autoComplete="off"
                list="country-options"
                value={guessInput}
                onChange={(event) => setGuessInput(event.target.value)}
                placeholder="Type a country"
                disabled={gameOver}
                aria-describedby="hint-text"
              />
              <datalist id="country-options">
                {countryOptions.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
              <button type="submit" disabled={gameOver}>
                Guess
              </button>
            </form>

            <p id="hint-text" className="footer">
              Wrong guess shows your guessed troop count and whether the target is higher (↑) or lower (↓).
            </p>

            <ul aria-live="polite">
              {guesses.map((result, index) => (
                <li className="result" key={`${result.guess}-${index}`}>
                  <span>
                    <strong>{result.guess}</strong> - {result.guessedTroops.toLocaleString()} troops
                  </span>
                  <span className={`badge ${result.correct ? "correct" : "incorrect"}`}>
                    {ARROW_LABEL[result.arrow]}
                  </span>
                </li>
              ))}
            </ul>

            {hasWon && <p className="status correct">You solved it.</p>}
            {hasLost && <p className="status incorrect">Out of guesses. Answer: {answer ?? "Unavailable"}</p>}
            {error && <p className="status incorrect">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}
