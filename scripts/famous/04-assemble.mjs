// Validates the written labels and bios and assembles src/data/famous.json.
// Usage: node scripts/famous/04-assemble.mjs
import fs from "node:fs";

const dir = new URL("../.cache/famous/", import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, dir)));
const src = (p) => fs.readFileSync(new URL(`../../src/data/${p}`, import.meta.url), "utf8");

const vocab = read("vocab.json");
const traitIds = new Set(vocab.traits.map((t) => t.split(" ")[0]));
const movementIds = new Set(vocab.movements.map((m) => m.split(" ")[0]));
const curatedArtistIds = new Set(vocab.artists.map((a) => a.split(" ")[0]));
const KINDS = new Set(["painting", "print", "drawing", "sculpture", "object", "textile", "manuscript"]);

const files = (prefix) => fs.readdirSync(new URL("written/", dir)).filter((f) => f.startsWith(prefix) && f.endsWith(".json"));
const works = files("works-").flatMap((f) => read(`written/${f}`));
const bios = files("artists-").flatMap((f) => read(`written/${f}`));

const problems = [];

// Hand corrections after review.
// One spelling per culture, so anonymous works group under one maker record.
const CULTURE_ALIASES = {
  "Sumer": "Mesopotamia", "Sumer (Mesopotamia)": "Mesopotamia", "Assyria (Mesopotamia)": "Mesopotamia",
  "Hellenistic Greece": "Ancient Greece", "Ancient Greece (Epidamnos)": "Ancient Greece",
  "Ancient Greece (Magna Graecia)": "Ancient Greece", "Mycenaean Greece": "Ancient Greece",
  "Etruscan": "Etruria", "Kingdom of Benin (Edo), Nigeria": "Kingdom of Benin", "India (Maurya Empire)": "Maurya India",
  "Insular (Ireland and Scotland)": "Insular Britain and Ireland", "Natufian (Levant)": "Natufian Levant",
  "Iran (Safavid)": "Safavid Iran", "Rapa Nui (Easter Island)": "Rapa Nui",
};
const TITLE_OVERRIDES = { "the-massacre-at-chios": "The Massacre at Chios" };
const IMAGE_OVERRIDES = {
  // The research image was the Royal Ontario Museum's cast; this is the original in Cairo, serpopard side.
  "narmer-palette": "The Narmer Palette, early First Dynasty, ca. 3000 BCE; Egyptian Museum, Cairo (2).jpg",
};
async function commonsImage(file) {
  const q = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size&iiurlwidth=1280&titles=${encodeURIComponent("File:" + file)}`;
  const ii = (await (await fetch(q, { headers: { "User-Agent": "AIArtMuseum/0.2 (https://github.com/cl-poehl/imaginary-museum)" } })).json()).query.pages[0].imageinfo[0];
  return { src: (ii.thumburl || ii.url).split("?")[0], width: ii.thumbwidth || ii.width, height: ii.thumbheight || ii.height, source: ii.descriptionurl };
}
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Artists written from research, keyed by QID and by name. A bio whose id is
// already a hand-written artist (e.g. Rembrandt) is just an alias for them.
const aliases = bios.filter((b) => curatedArtistIds.has(b.id));
const newBios = bios.filter((b) => !curatedArtistIds.has(b.id));
const byQid = new Map(bios.map((b) => [b.qid, b]));
const byName = new Map(bios.map((b) => [b.name.toLowerCase(), b]));
const usedArtistIds = new Set(curatedArtistIds);
for (const b of newBios) {
  if (usedArtistIds.has(b.id)) problems.push(`duplicate artist id: ${b.id}`);
  usedArtistIds.add(b.id);
}
if (aliases.length) console.log("bios mapped onto existing artists:", aliases.map((b) => b.id).join(", "));

const anon = new Map();
const missingArtists = new Set();
const out = [];
const seen = new Set();
const index = read("research/works-index.json");
const researchIds = new Set(index.map((m) => m.id));

for (const w of works) {
  const where = `work ${w.id}`;
  if (!researchIds.has(w.id)) problems.push(`${where}: unknown id`);
  if (seen.has(w.id)) problems.push(`${where}: duplicate`);
  seen.add(w.id);
  if (!movementIds.has(w.movement)) problems.push(`${where}: movement ${w.movement}`);
  const badTraits = (w.traits ?? []).filter((t) => !traitIds.has(t));
  if (badTraits.length) problems.push(`${where}: traits ${badTraits}`);
  if (!KINDS.has(w.kind)) problems.push(`${where}: kind ${w.kind}`);
  if (JSON.stringify(w).includes("—")) problems.push(`${where}: em dash`);
  if (!w.blurb || !w.lookCloser) problems.push(`${where}: missing text`);

  w.culture = CULTURE_ALIASES[w.culture] ?? w.culture;
  let artist = w.artist;
  if (artist === "anon") {
    const culture = w.culture || "Unknown";
    artist = `anon-${slug(culture)}`;
    const a = anon.get(artist) ?? { id: artist, name: `Unknown artist, ${culture}`, lifespan: "", born: w.date, nationality: "", birthplace: "", movements: [], bio: "", wiki: "", anonymous: true };
    a.born = Math.min(a.born, w.date);
    anon.set(artist, a);
  } else if (/^Q\d+$/.test(artist)) {
    const b = byQid.get(artist);
    if (b) artist = b.id;
    else missingArtists.add(`${artist} (${w.id})`);
  } else if (artist.startsWith("name:")) {
    const b = byName.get(artist.slice(5).toLowerCase());
    if (b) artist = b.id;
    else missingArtists.add(`${artist} (${w.id})`);
  } else if (!curatedArtistIds.has(artist)) {
    problems.push(`${where}: unknown artist ${artist}`);
  }

  const research = JSON.parse(fs.readFileSync(new URL(`research/works/${w.id}.json`, dir))).meta;
  if (IMAGE_OVERRIDES[w.id]) research.image = await commonsImage(IMAGE_OVERRIDES[w.id]);
  out.push({
    id: w.id, title: TITLE_OVERRIDES[w.id] ?? w.title, artist, year: w.year, date: w.date, movement: w.movement, medium: w.medium,
    dimensions: w.dimensions ?? "", collection: w.collection, blurb: w.blurb, lookCloser: w.lookCloser, traits: w.traits,
    kind: w.kind, culture: w.culture, fame: research.fame, image: research.image,
  });
}

for (const id of researchIds) if (!seen.has(id)) problems.push(`work ${id}: not written`);

// Artist records: movements come from the works they made here.
const worksBy = new Map();
for (const w of out) worksBy.set(w.artist, [...(worksBy.get(w.artist) ?? []), w]);
const artists = [...newBios.filter((b) => worksBy.has(b.id)), ...anon.values()].map((a) => {
  const { qid: _qid, ...rest } = a;
  return { ...rest, movements: [...new Set((worksBy.get(a.id) ?? []).map((w) => w.movement))] };
});
for (const a of artists) if (JSON.stringify(a).includes("—")) problems.push(`artist ${a.id}: em dash`);

// Fame for the hand-written works, from the same ranking.
const ranked = read("ranked.json");
const norm = (s) => (s ?? "").toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]+/g, " ").trim();
const curatedTitles = [...src("artworks.ts").matchAll(/id: "([^"]+)",\n    title: "([^"]+)"/g)].map((m) => [m[1], m[2]]);
const curatedFame = {};
for (const [id, title] of curatedTitles) {
  const hit = ranked.find((r) => norm(r.label) === norm(title)) ?? ranked.find((r) => norm(r.label).startsWith(norm(title)));
  curatedFame[id] = hit?.sitelinks ?? 20;
}

fs.writeFileSync(new URL("../../src/data/famous.json", import.meta.url), JSON.stringify({ artists, artworks: out, curatedFame }, null, 1) + "\n");
console.log(`works ${out.length}, artists ${artists.length} (${anon.size} anonymous), bios without works ${newBios.filter((b) => !worksBy.has(b.id)).map((b) => b.id).join(", ") || "none"}`);
if (missingArtists.size) console.log("MISSING ARTISTS:", [...missingArtists].join("; "));
if (problems.length) console.log("PROBLEMS:\n" + problems.join("\n"));
const kinds = {}; out.forEach((w) => (kinds[w.kind] = (kinds[w.kind] ?? 0) + 1)); console.log(kinds);
const moves = {}; out.forEach((w) => (moves[w.movement] = (moves[w.movement] ?? 0) + 1)); console.log(moves);
