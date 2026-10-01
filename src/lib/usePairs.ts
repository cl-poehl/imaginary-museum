"use client";

// Choosing between two works, wherever it happens: on the pairs page or in the
// museum's taste room. Each choice is stored, the taste model retrained, and
// the next pair picked; a choice that says something gets a moment to show
// (and a line about what it suggests) before the pair moves on.

import { useCallback, useEffect, useRef, useState } from "react";
import { useStored, writeStored } from "@/lib/store";
import { insightFor, nextPair, train, type Choice, type Verdict } from "@/lib/taste";

export function usePairs() {
  const { stored, model, ready } = useStored();
  const [outcome, setOutcome] = useState<{ winner: string | null; verdict?: Verdict } | null>(null);
  const [insight, setInsight] = useState<{ text: string; key: number } | null>(null);
  const busy = useRef(false);
  const pair = stored.current;

  // First visit: nothing stored yet, so seed the opening pair.
  useEffect(() => {
    if (ready && !stored.current) writeStored({ current: nextPair(stored.history, model) });
  }, [ready, stored, model]);

  const decide = useCallback(
    (winner: string | null, verdict?: Verdict) => {
      if (!pair || busy.current) return;
      busy.current = true;
      const choice: Choice = { a: pair[0], b: pair[1], winner, verdict, at: Date.now() };
      const history = [...stored.history, choice];
      const nextModel = train(history, stored.favorites);
      const informative = Boolean(winner || verdict);
      if (informative) {
        setOutcome({ winner, verdict });
        const text = insightFor(choice, nextModel);
        setInsight(text ? { text, key: history.length } : null);
      }
      window.setTimeout(
        () => {
          writeStored({ history, current: nextPair(history, nextModel) });
          setOutcome(null);
          busy.current = false;
        },
        informative ? 520 : 0,
      );
    },
    [pair, stored.history, stored.favorites],
  );

  const undo = useCallback(() => {
    const last = stored.history.at(-1);
    if (!last || busy.current) return;
    writeStored({ history: stored.history.slice(0, -1), current: [last.a, last.b] });
    setInsight(null);
  }, [stored.history]);

  const clearInsight = useCallback(() => setInsight(null), []);

  return { stored, model, ready, pair, outcome, insight, decide, undo, clearInsight };
}
