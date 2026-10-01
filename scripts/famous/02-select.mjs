// Picks the collection: the most famous public-domain artworks, cleaned of
// monuments, photographs and copyrighted modern works, plus a hand-picked list
// of masterpieces that Wikidata files under types the ranking misses.
// Usage: node scripts/famous/02-select.mjs → scripts/.cache/famous/selected.json
import fs from "node:fs";

const UA = "AIArtMuseum/0.2 (https://github.com/cl-poehl/imaginary-museum)";
const dir = new URL("../.cache/famous/", import.meta.url);
const ranked = JSON.parse(fs.readFileSync(new URL("ranked.json", dir)));
const TARGET = Number(process.argv[2] ?? 300);

// Not artworks in the gallery sense, disputed/fake, or monuments rather than art.
const EXCLUDE = new Set([
  "Statue of Liberty", "Christ the Redeemer", "The Little Mermaid", "Statue of Unity", "Trevi Fountain", "Manneken Pis",
  "Wikipedia Monument", "Pale Blue Dot", "The Motherland Calls", "caryatid", "Pillars of Creation", "Siegessäule",
  "Raising the Flag on Iwo Jima", "Webb's First Deep Field", "Guerrillero Heroico", "Mesha Stele", "bull of Phalaris", "Bliss",
  "Lunch atop a Skyscraper", "Madurodam", "totem pole", "Jeanneke Pis", "Merlion", "We Can Do It!",
  "View from the Window at Le Gras", "Raising a flag over the Reichstag", "Fallen Astronaut", "Bocca della Verità",
  "Spire of Dublin", "Tian Tan Buddha", "Angel of the North", "crystal skull", "Unisphere", "Omphalos", "Triton Fountain",
  "My God, Help Me to Survive This Deadly Love", "Kryptos", "Black Obelisk of Shalmaneser III", "Bronze Soldier of Tallinn",
  "Serpent Column", "Hermannsdenkmal", "Havis Amanda", "Emerald Buddha", "Norra skenet", "Columbus Circle", "Mother Albania",
  "Marine Corps War Memorial", "Charging Bull", "Liberty Statue", "Colonne Vendôme", "Yazılıkaya", "The Sphere",
  "Grön eld, Umeå", "Lion Monument", "Shoes on the Danube Bank", "Sea organ", "padrão", "Victims of Communism Memorial",
  "The Day the Earth Smiled", "Bir el Qutt inscriptions", "Bloody Saturday", "Sibelius Monument", "Saqqara Bird",
  "Mary Untier of Knots", "Chollima Statue", "Dona i Ocell", "Column of Antoninus Pius", "Maman", "Adiyogi Shiva statue",
  "Family Portrait", "A Jewish boy surrenders in Warsaw", "Venus of Tan-Tan", "Venus of Berekhat Ram", "Venus of Moravany",
  "Venus of Galgenberg", "Fountain", "Cloud Gate", "Shigir Idol", "Salvator Mundi", "The Battle of Anghiari",
  "Rock Paintings of Hua Mountain", "Colossi of Memnon", "The Source", "Beauty Revealed", "Pasquino", "Lady of Auxerre",
  "'Ain Ghazal Statues", "Altarpiece of Veit Stoss in Kraków", "St. Peter's Baldachin", "Chair of Saint Peter",
  // Same works as the hand-written 54, under other names.
  "The Embarkation for Cythera", "Self-Portrait with Fur-Trimmed Robe", "A Sunday Afternoon on the Island of La Grande Jatte",
  "Madame X (Virginie Amélie Avegno Gautreau)",
]);

// Masterpieces the type-based ranking misses (QID → kind).
const MUST = {
  Q252485: "print", Q500242: "painting", Q186953: "painting", Q714802: "painting", Q187483: "textile", Q47672: "sculpture",
  Q9048095: "sculpture", Q3565037: "print", Q706846: "painting", Q248101: "sculpture", Q3062269: "sculpture",
  Q2040958: "sculpture", Q18003128: "sculpture", Q157541: "painting", Q471379: "painting", Q216402: "sculpture",
  Q204221: "manuscript", Q80935: "manuscript", Q211062: "manuscript", Q1813497: "painting", Q2392901: "painting",
  Q11935346: "painting", Q28092249: "painting", Q4997694: "painting", Q667124: "sculpture", Q1789503: "sculpture",
  Q592016: "sculpture", Q642140: "sculpture", Q130958: "sculpture", Q368138: "sculpture", Q26082: "object",
  Q656070: "object", Q937315: "object", Q695039: "object", Q1574072: "manuscript",
  Q105086910: "painting", Q15907822: "painting", Q1766064: "textile", Q93304: "sculpture", Q27920165: "sculpture",
  Q18385381: "sculpture", Q1126741: "object", Q12366269: "sculpture", Q667202: "painting", Q948745: "painting",
};
const PER_ARTIST = 8;

async function sparql(q) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), { headers: { "User-Agent": UA } });
    if (r.ok) return (await r.json()).results.bindings;
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
  throw new Error("SPARQL failed");
}

// Details for must-includes not already ranked.
const byQid = new Map(ranked.map((r) => [r.qid, r]));
const missing = Object.keys(MUST).filter((q) => !byQid.has(q));
if (missing.length) {
  const b = await sparql(`SELECT ?item ?label ?creatorLabel ?creator ?inception ?collectionLabel ?locationLabel ?img ?enwiki ?sl WHERE {
    VALUES ?item { ${missing.map((q) => "wd:" + q).join(" ")} }
    ?item wdt:P18 ?img; wikibase:sitelinks ?sl .
    OPTIONAL { ?item rdfs:label ?label FILTER(lang(?label)="en") }
    OPTIONAL { ?item wdt:P170 ?creator } OPTIONAL { ?item wdt:P571 ?inception }
    OPTIONAL { ?item wdt:P195 ?collection } OPTIONAL { ?item wdt:P276 ?location }
    OPTIONAL { ?enwiki schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
  for (const x of b) {
    const qid = x.item.value.split("/").pop();
    if (byQid.has(qid)) continue;
    byQid.set(qid, {
      qid, sitelinks: Number(x.sl.value), kind: MUST[qid], label: x.label?.value, creator: x.creatorLabel?.value,
      creatorQid: x.creator?.value.split("/").pop(), inception: x.inception?.value?.slice(0, 5), collection: x.collectionLabel?.value,
      location: x.locationLabel?.value, image: decodeURIComponent(x.img.value.split("/").pop()).replace(/_/g, " "), enwiki: x.enwiki?.value, must: true,
    });
  }
}
for (const q of Object.keys(MUST)) if (byQid.has(q)) byQid.get(q).must = true;

// Creator death years, to keep only public-domain artists.
const creators = [...new Set([...byQid.values()].map((r) => r.creatorQid).filter((q) => q && /^Q\d+$/.test(q)))];
const death = new Map();
for (let i = 0; i < creators.length; i += 200) {
  const b = await sparql(`SELECT ?c ?d WHERE { VALUES ?c { ${creators.slice(i, i + 200).map((q) => "wd:" + q).join(" ")} } ?c wdt:P570 ?d }`);
  for (const x of b) death.set(x.c.value.split("/").pop(), parseInt(x.d.value, 10));
}

const curatedTitles = fs.readFileSync(new URL("../../src/data/artworks.ts", import.meta.url), "utf8").match(/title: "([^"]+)"/g).map((t) => t.slice(8, -1).toLowerCase());
const norm = (s) => (s ?? "").toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]+/g, " ").trim();
const curatedNorm = new Set(curatedTitles.map(norm));
const isCurated = (r) => curatedNorm.has(norm(r.label)) || [...curatedNorm].some((t) => t.length > 8 && norm(r.label).startsWith(t));

const reasons = {};
const drop = (r, why) => ((reasons[why] ??= []).push(r.label), false);
const keep = (r) => {
  if (!r.label || r.label === "undefined") return drop(r, "no label");
  if (!r.enwiki && !r.must) return drop(r, "no English article");
  if (EXCLUDE.has(r.label)) return drop(r, "excluded by hand");
  if (isCurated(r)) return drop(r, "already curated");
  const y = parseInt(r.inception, 10);
  if (!r.must && y >= 1940) return drop(r, "too recent");
  const d = death.get(r.creatorQid);
  if (d && d > 1955) return drop(r, "copyright (artist died after 1955)");
  if (r.kind === "sculpture" && y >= 1850 && !/Rodin|Degas|Claudel/.test(r.creator ?? "")) return drop(r, "modern monument");
  return true;
};

const pool = [...byQid.values()].sort((a, b) => b.sitelinks - a.sitelinks);
const seenLabels = new Set();
const perArtist = new Map();
const selected = [];
for (const r of pool) {
  if (!keep(r)) continue;
  const key = norm(r.label) + "|" + norm(r.creator);
  if (seenLabels.has(key)) { drop(r, "duplicate"); continue; }
  const artist = r.creatorQid && /^Q\d+$/.test(r.creatorQid) ? r.creatorQid : null;
  if (artist && !r.must && (perArtist.get(artist) ?? 0) >= PER_ARTIST) { drop(r, "artist cap"); continue; }
  if (selected.length >= TARGET && !r.must) continue;
  if (artist) perArtist.set(artist, (perArtist.get(artist) ?? 0) + 1);
  seenLabels.add(key);
  selected.push({ ...r, deathYear: death.get(r.creatorQid) });
}
fs.writeFileSync(new URL("selected.json", dir), JSON.stringify(selected, null, 1));
for (const [k, v] of Object.entries(reasons)) console.error(`${k}: ${v.length}${v.length < 30 ? " · " + v.slice(0, 30).join("; ") : ""}`);
console.error("selected", selected.length, "lowest fame", selected.filter((s) => !s.must).at(-1)?.sitelinks);
const kinds = {}; selected.forEach((s) => (kinds[s.kind] = (kinds[s.kind] ?? 0) + 1)); console.error(kinds);
