// Gathers research for each selected work and each new artist: the English
// Wikipedia article text plus structured facts from Wikidata, and a verified
// Commons image. Writers read these files before writing any note.
// Usage: node scripts/famous/03-research.mjs
import fs from "node:fs";

const UA = "AIArtMuseum/0.2 (https://github.com/cl-poehl/imaginary-museum)";
const dir = new URL("../.cache/famous/", import.meta.url);
const R = new URL("research/", dir);
fs.mkdirSync(new URL("works/", R), { recursive: true });
fs.mkdirSync(new URL("artists/", R), { recursive: true });
const selected = JSON.parse(fs.readFileSync(new URL("selected.json", dir)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, json = true) {
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!json) return r;
      if (!r.ok) { await sleep(3000 * (i + 1)); continue; }
      return JSON.parse(await r.text());
    } catch { await sleep(3000 * (i + 1)); }
  }
  throw new Error("fetch failed " + url);
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function wikiText(title, max) {
  const d = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`);
  const p = d.query?.pages?.[0];
  if (!p || p.missing) return null;
  return { title: p.title, text: (p.extract ?? "").replace(/\n{3,}/g, "\n\n").slice(0, max) };
}

async function wikiSearch(q) {
  const d = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=1&srsearch=${encodeURIComponent(q)}`);
  return d.query?.search?.[0]?.title ?? null;
}

async function entities(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const d = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels|claims|descriptions|sitelinks&ids=${ids.slice(i, i + 50).join("|")}`);
    Object.assign(out, d.entities);
  }
  return out;
}

const labelCache = new Map();
async function labels(qids) {
  const need = [...new Set(qids)].filter((q) => q && !labelCache.has(q));
  for (let i = 0; i < need.length; i += 50) {
    const d = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels&ids=${need.slice(i, i + 50).join("|")}`);
    for (const [q, e] of Object.entries(d.entities)) labelCache.set(q, e.labels?.en?.value ?? q);
  }
  return qids.map((q) => labelCache.get(q));
}

const claimIds = (e, p) => (e.claims?.[p] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimTime = (e, p) => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value?.time ?? null;
function quantity(e, p) {
  const v = e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
  if (!v) return null;
  const unit = v.unit.split("/").pop();
  const u = { Q174728: "cm", Q11573: "m", Q174789: "mm", Q218593: "in" }[unit] ?? "";
  return `${Number(v.amount)}${u ? " " + u : ""}`;
}

async function commonsImage(file) {
  const d = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size&iiurlwidth=1280&titles=${encodeURIComponent("File:" + file)}`);
  const ii = d.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) return null;
  const src = (ii.thumburl || ii.url).split("?")[0];
  const ok = (await get(src, false)).status === 200;
  return ok ? { src, width: ii.thumbwidth || ii.width, height: ii.thumbheight || ii.height, source: ii.descriptionurl } : null;
}

// ---- works
const curatedIds = new Set(fs.readFileSync(new URL("../../src/data/artworks.ts", import.meta.url), "utf8").match(/id: "([^"]+)"/g).map((m) => m.slice(5, -1)));
const used = new Set(curatedIds);
const ents = await entities(selected.map((s) => s.qid));
const index = [];
let n = 0;
for (const s of selected) {
  n++;
  const e = ents[s.qid];
  let id = slug(s.label);
  if (used.has(id)) id = slug(`${s.label} ${(s.creator ?? "").split(" ").pop()}`);
  while (used.has(id)) id += "-2";
  used.add(id);
  const file = new URL(`works/${id}.json`, R);
  if (fs.existsSync(file)) { index.push(JSON.parse(fs.readFileSync(file)).meta); continue; }

  const title = s.enwiki ? decodeURIComponent(s.enwiki.split("/wiki/").pop()).replace(/_/g, " ") : await wikiSearch(s.label);
  const article = title ? await wikiText(title, 9000) : null;
  const creators = claimIds(e, "P170");
  const creatorLabels = await labels(creators);
  const materialLabels = await labels(claimIds(e, "P186"));
  const collectionLabels = await labels(claimIds(e, "P195"));
  const locationLabels = await labels(claimIds(e, "P276"));
  const movementLabels = await labels(claimIds(e, "P135"));
  const genreLabels = await labels(claimIds(e, "P136"));
  const depictsLabels = await labels(claimIds(e, "P180").slice(0, 12));
  const image = await commonsImage(s.image);
  const meta = {
    id, qid: s.qid, label: s.label, fame: s.sitelinks, kindHint: s.kind, creators: creators.map((q, i) => ({ qid: q, name: creatorLabels[i] })),
    inception: claimTime(e, "P571"), description: e.descriptions?.en?.value ?? null, materials: materialLabels,
    height: quantity(e, "P2048"), width: quantity(e, "P2049"), collection: collectionLabels, location: locationLabels,
    movement: movementLabels, genre: genreLabels, depicts: depictsLabels, wikipedia: article?.title ?? null, image,
  };
  fs.writeFileSync(file, JSON.stringify({ meta, article: article?.text ?? null }, null, 1));
  index.push(meta);
  if (n % 25 === 0) console.error(`works ${n}/${selected.length}`);
}
fs.writeFileSync(new URL("works-index.json", R), JSON.stringify(index, null, 1));
console.error("works done; no image:", index.filter((m) => !m.image).map((m) => m.id), "no article:", index.filter((m) => !m.wikipedia).map((m) => m.id));

// ---- artists (only ones not already in the hand-written list)
const curatedNames = fs.readFileSync(new URL("../../src/data/artists.ts", import.meta.url), "utf8").match(/name: "([^"]+)"/g).map((m) => m.slice(7, -1));
const surname = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).pop();
const curatedSurnames = new Map(curatedNames.map((n) => [surname(n), n]));
const creatorQids = [...new Set(index.flatMap((m) => m.creators.map((c) => c.qid)))];
const cents = await entities(creatorQids);
const artistIndex = [];
for (const q of creatorQids) {
  const e = cents[q];
  const name = e?.labels?.en?.value ?? q;
  const isHuman = claimIds(e, "P31").includes("Q5");
  const match = curatedSurnames.get(surname(name));
  const file = new URL(`artists/${q}.json`, R);
  const birthplace = await labels(claimIds(e, "P19"));
  const citizenship = await labels(claimIds(e, "P27"));
  const movements = await labels(claimIds(e, "P135"));
  const meta = {
    qid: q, name, isHuman, curatedMatch: match ?? null, born: claimTime(e, "P569"), died: claimTime(e, "P570"),
    birthplace: birthplace[0] ?? null, citizenship, movements, description: e?.descriptions?.en?.value ?? null,
    wikipedia: e?.sitelinks?.enwiki?.title ?? null,
  };
  if (!fs.existsSync(file)) {
    const article = isHuman && !match && meta.wikipedia ? await wikiText(meta.wikipedia, 5000) : null;
    fs.writeFileSync(file, JSON.stringify({ meta, article: article?.text ?? null }, null, 1));
  }
  artistIndex.push(meta);
}
fs.writeFileSync(new URL("artists-index.json", R), JSON.stringify(artistIndex, null, 1));
console.error("artists", artistIndex.length, "new humans", artistIndex.filter((a) => a.isHuman && !a.curatedMatch).length);
