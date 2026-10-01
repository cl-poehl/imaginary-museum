import Link from "next/link";
import { getArtist, thumb, type Artwork } from "@/data";

export function ArtCard({
  art,
  showArtist = true,
  badge,
  children,
}: {
  art: Artwork;
  showArtist?: boolean;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <Link href={`/works/${art.id}`} className="group block">
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-sm bg-wall p-5">
          <img
            src={thumb(art.image)}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-35 blur-2xl saturate-150 transition-opacity duration-700 [mask-image:radial-gradient(closest-side,black_30%,transparent)] group-hover:opacity-60"
          />
          <img
            src={thumb(art.image)}
            alt={art.title}
            width={art.image.width}
            height={art.image.height}
            loading="lazy"
            decoding="async"
            className="relative h-auto max-h-full w-auto max-w-full object-contain shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)] transition-transform duration-700 group-hover:scale-[1.035]"
          />
          {badge && <div className="absolute top-2.5 left-2.5">{badge}</div>}
        </div>
        <p className="mt-2.5 line-clamp-2 font-serif text-[14px] leading-snug transition-colors group-hover:text-accent">
          {art.title}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {showArtist && <>{getArtist(art.artist)?.name} · </>}
          {art.year}
        </p>
      </Link>
      {children}
    </div>
  );
}

export function ArtworkGrid({ works, showArtist = true }: { works: Artwork[]; showArtist?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {works.map((art) => (
        <li key={art.id}>
          <ArtCard art={art} showArtist={showArtist} />
        </li>
      ))}
    </ul>
  );
}
