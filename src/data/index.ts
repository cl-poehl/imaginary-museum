import { ARTISTS, type Artist } from "./artists";
import { ARTWORK_ENTRIES, type ArtworkEntry } from "./artworks";
import famous from "./famous.json";
import images from "./images.json";
import hosted from "./hosted.json";
import { MOVEMENTS, type Movement } from "./movements";
import { WORLD_MOVEMENTS } from "./movements-world";

export type { Artist, Movement };
export { TRAITS, TRAIT_GROUPS, type TraitGroup } from "./traits";

export type ArtImage = {
  src: string;
  thumb?: string;
  width: number;
  height: number;
  source: string;
  /** Where the site's own copies live (`<hosted>-400|960|1600.webp`), when it has them. */
  hosted?: string;
};
export type Kind = "painting" | "print" | "drawing" | "sculpture" | "object" | "textile" | "manuscript";
export type Artwork = ArtworkEntry & {
  image: ArtImage;
  kind: Kind;
  culture?: string;
  origin?: "aic" | "met";
  /** How many Wikipedia language editions have an article about the work. */
  fame: number;
};

export const KIND_LABELS: Record<Kind, string> = {
  painting: "paintings",
  print: "prints",
  drawing: "drawings",
  sculpture: "sculpture",
  object: "objects",
  textile: "textiles",
  manuscript: "manuscripts",
};

const imageMap = images as Record<string, ArtImage>;

// The world's most famous public-domain works, researched and written up by
// scripts/famous (see its WRITING_GUIDE.md).
type Famous = { artists: Artist[]; artworks: Artwork[]; curatedFame: Record<string, number> };
const world = famous as Famous;

/** The original 54 hand-written works. */
const curated: Artwork[] = ARTWORK_ENTRIES.map((a) => ({
  ...a,
  image: imageMap[a.id],
  kind: a.movement === "ukiyo-e" ? "print" : "painting",
  fame: world.curatedFame[a.id] ?? 20,
}));

// Works whose images the site hosts itself (scripts/host-images.mjs) are shown from those copies.
const HOSTED: Record<string, unknown> = hosted;
export const artworks: Artwork[] = [...curated, ...world.artworks].map((a) =>
  a.id in HOSTED ? { ...a, image: { ...a.image, hosted: `/art/${a.id}` } } : a,
);
export const artists: Artist[] = [...ARTISTS, ...world.artists].sort((a, b) => a.born - b.born);

// Only epochs that actually hold works in the collection.
const used = new Set(artworks.map((a) => a.movement));
export const movements: Movement[] = [...MOVEMENTS, ...WORLD_MOVEMENTS]
  .filter((m) => used.has(m.id))
  .sort((a, b) => a.start - b.start || a.end - b.end);

/** The most famous works, used to open a first session with pairs everyone knows. */
export const mostFamous = new Set(
  [...artworks].sort((a, b) => b.fame - a.fame).slice(0, 80).map((a) => a.id),
);

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const artworkMap = byId(artworks);
const artistMap = byId(artists);
const movementMap = byId(movements);

export const getArtwork = (id: string) => artworkMap.get(id);
export const getArtist = (id: string) => artistMap.get(id);
export const getMovement = (id: string) => movementMap.get(id);

export const worksByArtist = (id: string) =>
  artworks.filter((a) => a.artist === id).sort((a, b) => a.date - b.date);
export const worksInMovement = (id: string) =>
  artworks.filter((a) => a.movement === id).sort((a, b) => a.date - b.date);
export const artistsInMovement = (id: string) => artists.filter((a) => a.movements.includes(id));

// Wikimedia serves fixed thumbnail widths, so swap the width in the URL.
// Museum images carry their own small rendition in `thumb`.
export function thumb(image: ArtImage, width: 500 | 960 | 1920 = 500) {
  if (image.hosted) return `${image.hosted}-${width === 500 ? 400 : width === 960 ? 960 : 1600}.webp`;
  if (image.src.includes("/1280px-")) return image.src.replace("/1280px-", `/${width}px-`);
  return width === 500 ? (image.thumb ?? image.src) : image.src;
}

export function similarWorks(id: string, n = 4) {
  const base = getArtwork(id);
  if (!base) return [];
  const set = new Set(base.traits);
  return artworks
    .filter((a) => a.id !== id)
    .map((a) => ({
      a,
      s:
        a.traits.filter((t) => set.has(t)).length +
        (a.movement === base.movement ? 2 : 0) +
        (a.artist === base.artist ? 1 : 0),
    }))
    .sort((x, y) => y.s - x.s)
    .slice(0, n)
    .map((x) => x.a);
}

export function centuryLabel(year: number) {
  const bce = year < 0;
  const c = bce ? Math.floor(-year / 100) + 1 : Math.floor(year / 100) + 1;
  const suffix = c % 10 === 1 && c !== 11 ? "st" : c % 10 === 2 && c !== 12 ? "nd" : c % 10 === 3 && c !== 13 ? "rd" : "th";
  return `${c}${suffix} century${bce ? " BCE" : ""}`;
}

export const yearLabel = (y: number) => {
  const n = Math.abs(y);
  const shown = n >= 10000 ? n.toLocaleString("en-US") : String(n);
  return y < 0 ? `${shown} BCE` : shown;
};
