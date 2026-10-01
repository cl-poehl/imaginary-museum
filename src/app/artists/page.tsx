import type { Metadata } from "next";
import Link from "next/link";
import { artists, getMovement, worksByArtist, type Artist } from "@/data";

export const metadata: Metadata = { title: "Artists" };

function Row({ a }: { a: Artist }) {
  const n = worksByArtist(a.id).length;
  return (
    <li className="border-b border-line">
      <Link href={`/artists/${a.id}`} className="group grid items-baseline gap-1 py-4 sm:grid-cols-[1fr_14rem_11rem] sm:gap-6">
        <span className="font-serif text-[18px] leading-tight transition-colors group-hover:text-accent">{a.name}</span>
        <span className="truncate text-sm text-muted">{a.movements.map((m) => getMovement(m)?.name).join(" / ")}</span>
        <span className="font-mono text-xs text-faint tabular-nums sm:text-right">
          {[a.lifespan, `${n} ${n === 1 ? "work" : "works"}`].filter(Boolean).join(" · ")}
        </span>
      </Link>
    </li>
  );
}

export default function ArtistsPage() {
  const named = artists.filter((a) => !a.anonymous);
  const anonymous = artists.filter((a) => a.anonymous);
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 sm:px-8">
      <header className="flex flex-col gap-4 pt-12 pb-10">
        <p className="label text-muted">Index</p>
        <h1 className="font-serif text-[34px] leading-tight md:text-[40px]">Artists</h1>
        <p className="max-w-xl text-muted">
          {named.length} named artists in order of birth
          {anonymous.length > 0 && `, and the unrecorded makers of ${anonymous.length} traditions`}.
        </p>
      </header>
      <ul className="border-t border-line">
        {named.map((a) => (
          <Row key={a.id} a={a} />
        ))}
      </ul>
      {anonymous.length > 0 && (
        <>
          <h2 className="mt-20 mb-6 font-serif text-[22px]">Unrecorded makers</h2>
          <ul className="border-t border-line">
            {anonymous.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
