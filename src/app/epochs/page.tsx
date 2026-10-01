import type { Metadata } from "next";
import Link from "next/link";
import { movements, thumb, worksInMovement, yearLabel } from "@/data";

export const metadata: Metadata = { title: "Epochs" };

// A piecewise axis: each tick gets the same width, so five millennia of
// antiquity and the busy centuries since 1400 both stay readable.
const TICKS = [-3000, -1000, 0, 800, 1400, 1600, 1800, 1950];
function pct(year: number) {
  const y = Math.min(Math.max(year, TICKS[0]), TICKS.at(-1)!);
  const i = Math.max(0, TICKS.findIndex((t, j) => y <= TICKS[j + 1] && y >= t));
  const [a, b] = [TICKS[i], TICKS[i + 1] ?? TICKS[i]];
  const within = b === a ? 0 : (y - a) / (b - a);
  return ((i + within) / (TICKS.length - 1)) * 100;
}

export default function EpochsPage() {
  const span = `${yearLabel(movements[0].start)} to ${yearLabel(Math.max(...movements.map((m) => m.end)))}`;
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 sm:px-8">
      <header className="flex flex-col gap-4 pt-12 pb-10">
        <p className="label text-muted">Timeline · {span}</p>
        <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">Epochs</h1>
        <p className="max-w-xl text-muted">
          {movements.length} periods, schools and traditions in the collection. Each one links to its story, its artists
          and its works.
        </p>
        <Link href="/tour" className="label w-fit border border-fg/60 px-5 py-2.5 text-fg transition-colors hover:bg-fg hover:text-bg">
          Take the grand tour
        </Link>
      </header>

      <div className="sticky top-[var(--header-h)] z-10 hidden grid-cols-[17rem_1fr_9rem] gap-6 border-b border-line bg-bg/80 py-2 backdrop-blur md:grid">
        <span />
        <div className="relative h-4">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 font-mono text-[10px] whitespace-nowrap text-faint tabular-nums"
              style={{ left: `${pct(t)}%` }}
            >
              {t < 0 ? `${-t} BCE` : t}
            </span>
          ))}
        </div>
        <span />
      </div>

      <ol>
        {movements.map((m) => {
          const works = worksInMovement(m.id);
          return (
            <li key={m.id} className="border-b border-line">
              <Link
                href={`/epochs/${m.id}`}
                className="group grid items-center gap-3 py-5 md:grid-cols-[17rem_1fr_9rem] md:gap-6"
              >
                <div>
                  <p className="font-serif text-[18px] leading-tight transition-colors group-hover:text-accent">{m.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {m.region} ·{" "}
                    <span className="font-mono tabular-nums">
                      {yearLabel(m.start)}–{yearLabel(m.end)}
                    </span>{" "}
                    · {works.length} {works.length === 1 ? "work" : "works"}
                  </p>
                </div>
                <div className="relative hidden h-6 md:block">
                  {TICKS.map((t) => (
                    <span key={t} className="absolute inset-y-0 w-px bg-white/[0.05]" style={{ left: `${pct(t)}%` }} />
                  ))}
                  <span
                    className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/60 transition-all group-hover:h-2 group-hover:bg-[image:var(--aurora)]"
                    style={{ left: `${pct(m.start)}%`, width: `${Math.max(pct(m.end) - pct(m.start), 0.8)}%` }}
                  />
                </div>
                <div className="flex gap-1.5">
                  {works.slice(0, 3).map((w) => (
                    <img
                      key={w.id}
                      src={thumb(w.image)}
                      alt=""
                      loading="lazy"
                      className="size-10 rounded-sm object-cover opacity-80 transition-opacity group-hover:opacity-100"
                    />
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
