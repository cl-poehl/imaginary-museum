import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Affinity } from "@/components/Affinity";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { artistsInMovement, getMovement, movements, worksInMovement, yearLabel } from "@/data";

export function generateStaticParams() {
  return movements.map((m) => ({ id: m.id }));
}

export async function generateMetadata(props: PageProps<"/epochs/[id]">): Promise<Metadata> {
  const m = getMovement((await props.params).id);
  return m ? { title: m.name, description: m.summary } : {};
}

export default async function EpochPage(props: PageProps<"/epochs/[id]">) {
  const movement = getMovement((await props.params).id);
  if (!movement) notFound();
  const works = worksInMovement(movement.id);
  const people = artistsInMovement(movement.id);
  const idx = movements.findIndex((m) => m.id === movement.id);
  const prev = movements[idx - 1];
  const next = movements[idx + 1];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-line pt-12 pb-10">
        <p className="label text-muted">
          <Link href="/epochs" className="link hover:text-fg">
            Epochs
          </Link>
          <span className="text-faint"> · </span>
          {movement.region}
        </p>
        <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">{movement.name}</h1>
        <p className="font-mono text-sm text-muted tabular-nums">
          c. {yearLabel(movement.start)} – {yearLabel(movement.end)}
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <Link
            href={`/?room=${movement.id}`}
            className="label border border-fg/60 px-5 py-2.5 text-fg transition-colors hover:bg-fg hover:text-bg"
          >
            Tour this room
          </Link>
          <Affinity feature={`m:${movement.id}`} />
        </div>
      </header>

      <section className="grid gap-12 py-10 md:grid-cols-[1fr_16rem]">
        <p className="max-w-prose text-[14px] leading-[1.75] text-fg/90">{movement.summary}</p>
        <div className="flex flex-col gap-8">
          <div>
            <p className="label mb-3 text-faint">Hallmarks</p>
            <ul className="flex flex-col gap-2 text-sm">
              {movement.hallmarks.map((h) => (
                <li key={h} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-3 text-faint">Artists here</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {people.map((a) => (
                <li key={a.id}>
                  <Link href={`/artists/${a.id}`} className="link">
                    {a.name}
                  </Link>
                  {a.lifespan && <span className="text-faint"> · {a.lifespan}</span>}
                </li>
              ))}
            </ul>
          </div>
          <a href={movement.wiki} target="_blank" rel="noreferrer" className="link w-fit text-sm">
            Read further on Wikipedia ↗
          </a>
        </div>
      </section>

      <section className="pt-6">
        <h2 className="label mb-6 text-muted">
          Works <span className="text-faint">({works.length})</span>
        </h2>
        <ArtworkGrid works={works} />
      </section>

      <nav className="mt-20 flex justify-between border-t border-line pt-6 text-sm">
        {prev ? (
          <Link href={`/epochs/${prev.id}`} className="text-muted hover:text-fg">
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/epochs/${next.id}`} className="text-muted hover:text-fg">
            {next.name} →
          </Link>
        )}
      </nav>
    </main>
  );
}
