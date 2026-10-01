// Computes CLIP image embeddings for every artwork (the 54 hand-written works
// and everything in src/data/famous.json) and writes:
//   src/data/embeddings.json      512-d, L2-normalised, int8 (base64) per work
//   src/data/embeddings-pca.json  16 PCA components per work, unit variance
// Run after scripts/famous/04-assemble.mjs. Thumbnails are cached in scripts/.cache.
//
// Usage: node scripts/embed-images.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from "@huggingface/transformers";

process.removeAllListeners("warning"); // Node's notice about importing .ts files

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE = path.join(ROOT, "scripts/.cache");
const DATA = path.join(ROOT, "src/data");
const MODEL = "Xenova/clip-vit-base-patch32";
const PCA_DIMS = 16;
const BATCH = 16;
const UA = "AIArtMuseum/0.1 (Pendant art museum data import; https://github.com/cl-poehl/imaginary-museum)";

env.cacheDir = path.join(CACHE, "models");

const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Works and their images
// ---------------------------------------------------------------------------

const { ARTWORK_ENTRIES } = await import("../src/data/artworks.ts");
const curatedImages = JSON.parse(fs.readFileSync(path.join(DATA, "images.json"), "utf8"));
const famous = JSON.parse(fs.readFileSync(path.join(DATA, "famous.json"), "utf8"));
const small = (src) => src.replace("/1280px-", "/500px-");

const works = [
  ...ARTWORK_ENTRIES.map((w) => ({
    id: w.id, title: w.title, url: small(curatedImages[w.id].src), file: path.join(CACHE, "img/curated", `${w.id}.jpg`),
  })),
  ...famous.artworks.map((w) => ({
    id: w.id, title: w.title, kind: w.kind, url: small(w.image.src), file: path.join(CACHE, "img/famous", `${w.id}.jpg`),
  })),
];

async function ensureImage(w) {
  if (fs.existsSync(w.file) && fs.statSync(w.file).size > 500) return;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(w.url, { headers: { "User-Agent": UA } }).catch(() => null);
    if (r?.ok) {
      fs.mkdirSync(path.dirname(w.file), { recursive: true });
      fs.writeFileSync(w.file, Buffer.from(await r.arrayBuffer()));
      return;
    }
    await sleep(1000 * 2 ** i);
  }
  throw new Error(`Could not download ${w.url}`);
}

async function loadImage(file) {
  // Decode with sharp (handles CMYK/greyscale/EXIF rotation) into RGB pixels.
  const { data, info } = await sharp(file)
    .rotate()
    .resize(448, 448, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

console.log(`Embedding ${works.length} works with ${MODEL}…`);
let missing = 0;
for (const w of works) {
  if (!fs.existsSync(w.file)) missing++;
}
if (missing) console.log(`  downloading ${missing} images not in cache`);
for (const w of works) await ensureImage(w);

const processor = await AutoProcessor.from_pretrained(MODEL);
const model = await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: "fp32" });

const vectors = new Map();
for (let i = 0; i < works.length; i += BATCH) {
  const batch = works.slice(i, i + BATCH);
  const images = await Promise.all(batch.map((w) => loadImage(w.file)));
  const inputs = await processor(images);
  const { image_embeds } = await model(inputs);
  const dim = image_embeds.dims[1];
  const data = image_embeds.data;
  batch.forEach((w, k) => {
    const v = Float32Array.from(data.subarray(k * dim, (k + 1) * dim));
    const n = Math.hypot(...v);
    for (let j = 0; j < dim; j++) v[j] /= n;
    vectors.set(w.id, v);
  });
  process.stdout.write(`\r  ${Math.min(i + BATCH, works.length)}/${works.length}`);
}
process.stdout.write("\n");

const ids = works.map((w) => w.id);
const D = vectors.get(ids[0]).length;

// int8 quantisation: round(v * 127), base64 of the raw bytes.
const quant = {};
for (const id of ids) {
  const v = vectors.get(id);
  const q = new Int8Array(D);
  for (let j = 0; j < D; j++) q[j] = Math.max(-127, Math.min(127, Math.round(v[j] * 127)));
  quant[id] = Buffer.from(q.buffer).toString("base64");
}
fs.writeFileSync(path.join(DATA, "embeddings.json"), JSON.stringify({ model: MODEL, dims: D, vectors: quant }) + "\n");

// ---------------------------------------------------------------------------
// PCA (subspace iteration on the 512x512 covariance), 16 components, each
// standardised to unit variance.
// ---------------------------------------------------------------------------

const n = ids.length;
const mean = new Float64Array(D);
for (const id of ids) vectors.get(id).forEach((x, j) => (mean[j] += x / n));
const X = ids.map((id) => Float64Array.from(vectors.get(id), (x, j) => x - mean[j]));
const C = Array.from({ length: D }, () => new Float64Array(D));
for (const row of X)
  for (let a = 0; a < D; a++) {
    const ra = row[a];
    const Ca = C[a];
    for (let b = a; b < D; b++) Ca[b] += ra * row[b];
  }
for (let a = 0; a < D; a++) for (let b = a; b < D; b++) C[b][a] = C[a][b] /= n - 1;

// Deterministic start so reruns give identical output.
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
let Q = Array.from({ length: PCA_DIMS }, () => Float64Array.from({ length: D }, rand));
const matvec = (v) => {
  const out = new Float64Array(D);
  for (let a = 0; a < D; a++) {
    let s = 0;
    const Ca = C[a];
    for (let b = 0; b < D; b++) s += Ca[b] * v[b];
    out[a] = s;
  }
  return out;
};
const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
function orthonormalise(vs) {
  for (let i = 0; i < vs.length; i++) {
    for (let j = 0; j < i; j++) {
      const p = dot(vs[i], vs[j]);
      for (let k = 0; k < D; k++) vs[i][k] -= p * vs[j][k];
    }
    const nn = Math.sqrt(dot(vs[i], vs[i]));
    for (let k = 0; k < D; k++) vs[i][k] /= nn;
  }
  return vs;
}
Q = orthonormalise(Q);
for (let it = 0; it < 300; it++) Q = orthonormalise(Q.map(matvec));
const eig = Q.map((q) => dot(q, matvec(q)));
// Fix each component's sign so the largest-magnitude loading is positive.
for (const q of Q) {
  let m = 0;
  for (let k = 0; k < D; k++) if (Math.abs(q[k]) > Math.abs(m)) m = q[k];
  if (m < 0) for (let k = 0; k < D; k++) q[k] = -q[k];
}
const scores = X.map((row) => Q.map((q) => dot(row, q)));
const std = Q.map((_, c) => Math.sqrt(scores.reduce((s, r) => s + r[c] ** 2, 0) / (n - 1)));
const pca = {};
ids.forEach((id, i) => (pca[id] = scores[i].map((x, c) => Math.round((x / std[c]) * 1000) / 1000)));
fs.writeFileSync(path.join(DATA, "embeddings-pca.json"), JSON.stringify({ dims: PCA_DIMS, vectors: pca }) + "\n");

const totalVar = C.reduce((s, row, a) => s + row[a], 0);
console.log(
  `PCA: top ${PCA_DIMS} components explain ${((eig.reduce((a, b) => a + b, 0) / totalVar) * 100).toFixed(1)}% of variance`,
);

// ---------------------------------------------------------------------------
// Sanity check: nearest neighbours (cosine on the int8 vectors, as the server
// will compute them).
// ---------------------------------------------------------------------------

const decodeInt8 = (b64) => {
  const buf = Buffer.from(b64, "base64"); // may be a view into Node's shared pool
  return new Int8Array(buf.buffer, buf.byteOffset, buf.length);
};
const decoded = new Map(ids.map((id) => [id, decodeInt8(quant[id])]));
const cos = (a, b) => {
  let s = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) (s += a[i] * b[i]), (na += a[i] * a[i]), (nb += b[i] * b[i]);
  return s / Math.sqrt(na * nb);
};
const titleOf = new Map(works.map((w) => [w.id, w.title]));
const probes = ["starry-night", "great-wave", "girl-with-a-pearl-earring", "black-square", "mona-lisa", "david", "venus-de-milo"].filter((id) => decoded.has(id));
for (const id of probes) {
  const q = decoded.get(id);
  const nn = ids
    .filter((o) => o !== id)
    .map((o) => [o, cos(q, decoded.get(o))])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  console.log(`\n${titleOf.get(id)} (${id})`);
  for (const [o, s] of nn) console.log(`  ${s.toFixed(3)}  ${titleOf.get(o)} (${o})`);
}
const kb = (f) => (fs.statSync(path.join(DATA, f)).size / 1024).toFixed(0);
console.log(`\nWrote embeddings.json (${kb("embeddings.json")} KB) and embeddings-pca.json (${kb("embeddings-pca.json")} KB) for ${n} works.`);
