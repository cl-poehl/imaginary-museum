"use client";

import Link from "next/link";
import { useEffect } from "react";
import { artworks } from "@/data";

const STEPS: [string, string][] = [
  ["Choose", "Two works hang together. Pick the one you would rather live with: tap or click it, or use ← and → on a keyboard."],
  ["Both, neither, skip", "Love both, or neither? Say so with the buttons below them (↑ and ↓). Can't decide? Skip (Space). Each answer teaches your curator something different."],
  ["Look closer", "Labels show the full wall text, and Full screen leaves only the works (I and F on a keyboard). Save anything you'd hang at home."],
  ["Your taste", "After a few picks your curator reads your taste and suggests works you haven't seen yet."],
];

/** A short first-visit introduction, in the voice of a museum's welcome panel. */
export function Intro({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onEnter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEnter]);

  return (
    <section className="rise flex min-h-[calc(100dvh-var(--header-h))] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[36rem]">
        <p className="label text-faint">Welcome</p>
        <h1 className="mt-2 font-serif text-[34px] leading-tight md:text-[40px]">
          A museum that learns <span className="italic">your</span> taste.
        </h1>
        <p className="mt-3 max-w-[30rem] text-muted">
          {artworks.length} of the world&apos;s most famous works, from Ice Age carvings to Klimt. You see them two at a time. Every
          choice you make shapes what you see next.
        </p>

        <ol className="mt-10 border-t border-line">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="grid grid-cols-[2rem_9rem_1fr] items-baseline gap-x-3 border-b border-line py-3.5 max-sm:grid-cols-[2rem_1fr]">
              <span className="font-mono text-[11px] text-faint tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="label text-fg">{title}</span>
              <span className="text-[13px] leading-relaxed text-muted max-sm:col-start-2">{text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex items-center gap-6">
          <button
            onClick={onEnter}
            autoFocus
            className="label border border-fg/70 px-6 py-3 text-fg transition-colors hover:bg-fg hover:text-bg focus-visible:bg-fg focus-visible:text-bg focus-visible:outline-none"
          >
            Enter the gallery
          </button>
          <Link href="/tour" className="label text-muted transition-colors hover:text-fg">
            Or take the guided tour first →
          </Link>
        </div>
      </div>
    </section>
  );
}
