"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
  hintTroops: number;
  updatedAt: string;
  source: string;
  countries: string[];
};

const ARROW_LABEL: Record<GuessItem["arrow"], string> = {
  up: "↑",
  down: "↓",
  none: "OK"
};

const COUNTRY_ALIASES: Record<string, string> = {
  bolivia: "BO",
  brunei: "BN",
  cape verde: "CV",
  congo: "CG",
  "democratic republic of the congo": "CD",
  "ivory coast": "CI",
  laos: "LA",
  moldova: "MD",
  palestine: "PS",
  russia: "RU",
  south korea: "KR",
  north korea: "KP",
  syria: "SY",
  taiwan: "TW",
  tanzania: "TZ",
  turkey: "TR",
  venezuela: "VE",
  vietnam: "VN"
};

function normalizeCountryName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function codeToFlagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) {
    return "🏳️";
  }

  const [first, second] = code;
  const base = 127397;
  return String.fromCodePoint(base + first.charCodeAt(0), base + second.charCodeAt(0));
}

function getCountryCodeFromName(name: string): string | null {
  const normalized = normalizeCountryName(name);
  if (!normalized) {
    return null;
  }

  const alias = COUNTRY_ALIASES[normalized];
  if (alias) {
    return alias;
  }

  const intlWithRegions = Intl as typeof Intl & {
    supportedValuesOf?: (key: "region") => string[];
  };

  if (typeof intlWithRegions.supportedValuesOf !== "function") {
    return null;
  }

  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  for (const regionCode of intlWithRegions.supportedValuesOf("region")) {
    const regionName = displayNames.of(regionCode);
    if (regionName && normalizeCountryName(regionName) === normalized) {
      return regionCode;
    }
  }

  return null;
}

function getFlagForCountry(name: string): string {
  const code = getCountryCodeFromName(name);
  if (!code) {
    return "🏳️";
  }

  return codeToFlagEmoji(code);
}

function storageKey(date: string): string {
  return `troople:${date}`;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [guesses, setGuesses] = useState<GuessItem[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);

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
  const filteredOptions = useMemo(() => {
    const query = guessInput.trim().toLowerCase();
    if (!query) {
      return countryOptions.slice(0, 10);
    }

    return countryOptions.filter((country) => country.toLowerCase().includes(query)).slice(0, 10);
  }, [countryOptions, guessInput]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!inputWrapRef.current) {
        return;
      }

      if (!inputWrapRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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
      setShowDropdown(false);

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
            <section className="howToPlay" aria-label="How to play">
              <h2>How to play</h2>
              <p>Guess the country in 6 tries.</p>
              <p>Daily hint: the target country has exactly {today.hintTroops.toLocaleString()} standing troops.</p>
              <p>After each wrong guess, you see that country&apos;s troop count and:</p>
              <p>
                <strong>↑</strong> means target is higher, <strong>↓</strong> means target is lower.
              </p>
            </section>

            <div className="meta" aria-live="polite">
              <span>Date (GMT): {today.date}</span>
              <span>Target troops: {today.hintTroops.toLocaleString()}</span>
              <span>Guesses left: {Math.max(0, maxGuesses - usedGuesses)}</span>
            </div>

            <form className="guessForm" onSubmit={submitGuess}>
              <label htmlFor="guess-input" className="sr-only">
                Country guess
              </label>
              <div className="autocomplete" ref={inputWrapRef}>
                <input
                  id="guess-input"
                  name="guess"
                  type="text"
                  autoComplete="off"
                  value={guessInput}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(event) => {
                    setGuessInput(event.target.value);
                    setShowDropdown(true);
                  }}
                  placeholder="Type a country"
                  disabled={gameOver}
                  aria-describedby="hint-text"
                  aria-expanded={showDropdown && filteredOptions.length > 0}
                  aria-controls="country-options"
                />
                {showDropdown && filteredOptions.length > 0 && !gameOver && (
                  <ul id="country-options" className="autocompleteMenu" role="listbox">
                    {filteredOptions.map((country) => (
                      <li key={country}>
                        <button
                          type="button"
                          className="autocompleteItem"
                          onClick={() => {
                            setGuessInput(country);
                            setShowDropdown(false);
                          }}
                        >
                          {country}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
                    <strong>
                      {getFlagForCountry(result.guess)} {result.guess}
                    </strong>{" "}
                    - {result.guessedTroops.toLocaleString()} troops
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
