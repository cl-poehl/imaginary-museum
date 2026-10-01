import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FitBadge } from "@/components/Affinity";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { LitArtwork } from "@/components/LitArtwork";
import { CuratorNote, SaveButton } from "@/components/WorkClient";
import { artworks, getArtist, getArtwork, getMovement, similarWorks, TRAITS } from "@/data";
import { looksLike } from "@/lib/similar";
import { visitInfo } from "@/lib/visit";

export function generateStaticParams() {
  return artworks.map((a) => ({ id: a.id }));
}

export async function generateMetadata(props: PageProps<"/works/[id]">): Promise<Metadata> {
  const art = getArtwork((await props.params).id);
  return art ? { title: art.title, description: art.blurb || `${art.title}, ${art.year}` } : {};
}

export default async function WorkPage(props: PageProps<"/works/[id]">) {
  const art = getArtwork((await props.params).id);
  if (!art) notFound();
  const artist = getArtist(art.artist)!;
  const movement = getMovement(art.movement)!;
  const visit = visitInfo(art);
  const visual = looksLike(art.id, 8);
  const kindred = similarWorks(art.id, 8).filter((a) => !visual.includes(a)).slice(0, 4);

  const facts: [string, React.ReactNode][] = [
    [
      "Artist",
      <Link key="a" href={`/artists/${artist.id}`} className="link">
        {artist.name}
      </Link>,
    ],
    ["Date", art.year],
    [
      "Epoch",
      <Link key="m" href={`/epochs/${movement.id}`} className="link">
        {movement.name}
      </Link>,
    ],
    ["Medium", art.medium],
    ...(art.dimensions ? ([["Dimensions", art.dimensions]] as [string, string][]) : []),
    ...(art.culture ? ([["Culture", art.culture]] as [string, string][]) : []),
    ["Collection", art.collection],
  ];

  return (
    <main className="flex-1">
      <section className="relative h-[calc(100dvh-var(--header-h))] pb-8">
        <LitArtwork art={art} alt={`${art.title}, ${artist.name}`} sizes="100vw" />
        <a
          href="#label"
          className="absolute inset-x-0 bottom-2 truncate px-6 text-center text-[10.5px] tracking-wide text-faint transition-colors hover:text-muted"
        >
          <span className="text-muted">{artist.name}</span>
          <span className="mx-1.5">·</span>
          <span className="font-serif text-[12px] text-muted italic">{art.title}</span>
          <span className="mx-1.5">·</span>
          {art.year}
          <span className="mx-1.5">·</span>
          {art.medium}
          <span className="mx-1.5">·</span>
          {art.collection}
          <span className="ml-2">↓</span>
        </a>
      </section>

      <div
        id="label"
        className="mx-auto grid max-w-5xl scroll-mt-16 gap-12 px-5 pt-14 pb-20 md:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-20"
      >
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[13px]">
              <Link href={`/artists/${artist.id}`} className="hover:underline">
                {artist.name}
              </Link>
              {artist.lifespan && (
                <span className="text-faint">
                  {" "}
                  {artist.nationality ? `${artist.nationality}, ` : ""}
                  {artist.lifespan}
                </span>
              )}
            </p>
            <h1 className="mt-1 font-serif text-[28px] leading-tight md:text-[34px]">
              <span className="italic">{art.title}</span>
              <span className="text-muted">, {art.year}</span>
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SaveButton id={art.id} />
              <FitBadge id={art.id} />
            </div>
          </div>

          {art.blurb && <p className="max-w-prose text-[14px] leading-[1.75] text-fg/90">{art.blurb}</p>}

          {art.lookCloser && (
            <div className="border-l border-accent/40 pl-4">
              <p className="label mb-1 text-accent">Look closer</p>
              <p className="text-[13px] leading-relaxed text-muted">{art.lookCloser}</p>
            </div>
          )}

          <CuratorNote task="work" id={art.id} auto={!art.blurb} />
        </div>

        <aside className="flex flex-col gap-8">
          <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-[12.5px]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="label pt-[3px] text-faint">{k}</dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-line pt-5">
            <p className="label mb-1.5 text-faint">See it in person</p>
            <p className="text-[13px]">{visit.place}</p>
            <div className="label mt-2 flex flex-wrap gap-x-5 gap-y-1 text-faint">
              {visit.map && (
                <a href={visit.map} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
                  Map
                </a>
              )}
              <a href={visit.record} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
                {visit.recordLabel}
              </a>
            </div>
            <p className="mt-2 text-[11px] text-faint">
              {visit.isPrivate ? "Not on public view." : "Location as last recorded. Check with the museum before visiting."}
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-faint">
            {art.traits.map((t) => TRAITS[t]?.label).join(" · ")}
          </p>
        </aside>
      </div>

      <section className="mx-auto max-w-5xl border-t border-line px-5 py-14 md:px-8">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[22px]">Looks like this</h2>
          <p className="label text-faint">Compared by a vision model</p>
        </div>
        <ArtworkGrid works={visual} />
      </section>

      <section className="mx-auto max-w-5xl border-t border-line px-5 py-14 md:px-8">
        <h2 className="mb-8 font-serif text-[22px]">Shares its spirit</h2>
        <ArtworkGrid works={kindred} />
      </section>
    </main>
  );
}
