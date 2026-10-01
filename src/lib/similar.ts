import "server-only";
import { getArtwork, type Artwork } from "@/data";
import embeddings from "@/data/embeddings.json";

// CLIP image embeddings (512-d, L2-normalised, stored as int8 in base64).
// Server-only: pages are prerendered, so the 300 KB never reaches the browser.

const vectors = new Map<string, Int8Array>(
  Object.entries((embeddings as { vectors: Record<string, string> }).vectors).map(([id, b64]) => {
    const buf = Buffer.from(b64, "base64");
    return [id, new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength)];
  }),
);

function cosine(a: Int8Array, b: Int8Array) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
}

/** Works that look most like this one, whatever their period or place. */
export function looksLike(id: string, n = 8, exclude: Set<string> = new Set()): Artwork[] {
  const v = vectors.get(id);
  if (!v) return [];
  const base = getArtwork(id);
  return [...vectors]
    .filter(([other]) => other !== id && !exclude.has(other))
    .map(([other, w]) => ({ other, s: cosine(v, w) }))
    .sort((x, y) => y.s - x.s)
    .map(({ other }) => getArtwork(other))
    .filter((a): a is Artwork => Boolean(a) && a!.artist !== base?.artist)
    .slice(0, n);
}
