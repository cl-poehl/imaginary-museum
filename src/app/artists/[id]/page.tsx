import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Affinity } from "@/components/Affinity";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { CuratorNote } from "@/components/WorkClient";
import { artists, getArtist, getMovement, worksByArtist } from "@/data";

export function generateStaticParams() {
  return artists.map((a) => ({ id: a.id }));
}

export async function generateMetadata(props: PageProps<"/artists/[id]">): Promise<Metadata> {
  const artist = getArtist((await props.params).id);
  return artist ? { title: artist.name, description: artist.bio } : {};
}

export default async function ArtistPage(props: PageProps<"/artists/[id]">) {
  const artist = getArtist((await props.params).id);
  if (!artist) notFound();
  const works = worksByArtist(artist.id);
  const idx = artists.findIndex((a) => a.id === artist.id);
  const prev = artists[idx - 1];
  const next = artists[idx + 1];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-line pt-12 pb-10">
        <p className="label text-muted">
          Artist
          <span className="text-faint"> · </span>
          {artist.movements.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="text-faint"> / </span>}
              <Link href={`/epochs/${m}`} className="link hover:text-fg">
                {getMovement(m)?.name}
              </Link>
            </span>
          ))}
        </p>
        <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">{artist.name}</h1>
        <p className="text-muted">
          {[artist.nationality, artist.lifespan, artist.birthplace && `born ${artist.birthplace}`].filter(Boolean).join(" · ")}
        </p>
        <div>
          <Affinity feature={`a:${artist.id}`} />
        </div>
      </header>

      <section className="grid gap-10 py-10 md:grid-cols-[1fr_14rem]">
        <div className="flex flex-col gap-6">
          {artist.bio && <p className="max-w-prose text-[14px] leading-[1.75] text-fg/90">{artist.bio}</p>}
          <CuratorNote task="artist" id={artist.id} auto={!artist.bio} />
        </div>
        {artist.wiki && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="label text-faint">Read further</p>
            <a href={artist.wiki} target="_blank" rel="noreferrer" className="link w-fit">
              Wikipedia ↗
            </a>
          </div>
        )}
      </section>

      <section className="pt-6">
        <h2 className="label mb-6 text-muted">
          In the collection <span className="text-faint">({works.length})</span>
        </h2>
        <ArtworkGrid works={works} showArtist={false} />
      </section>

      <nav className="mt-20 flex justify-between border-t border-line pt-6 text-sm">
        {prev ? (
          <Link href={`/artists/${prev.id}`} className="text-muted hover:text-fg">
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/artists/${next.id}`} className="text-muted hover:text-fg">
            {next.name} →
          </Link>
        )}
      </nav>
    </main>
  );
}
