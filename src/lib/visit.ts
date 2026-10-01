import type { Artwork } from "@/data";

/** Where a work can be seen, with a map link when the location is public. */
export function visitInfo(art: Artwork) {
  const place = art.collection.replace(/\s*\(this impression\)\s*$/i, "");
  const isPrivate = /private collection/i.test(place);
  return {
    place,
    isPrivate,
    map: isPrivate ? null : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
    // Museum records for imported works; Commons file pages for the curated ones.
    record: art.image.source,
    recordLabel: art.origin ? "Museum record" : "Image source",
  };
}
