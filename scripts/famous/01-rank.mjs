// Ranks artworks by fame: the number of Wikipedia language editions with an
// article about them (Wikidata sitelinks). Only works with a Commons image.
// Usage: node scripts/famous/01-rank.mjs  → scripts/.cache/famous/ranked.json
import fs from "node:fs";

const UA = "AIArtMuseum/0.2 (https://github.com/cl-poehl/imaginary-museum)";
const out = new URL("../.cache/famous/", import.meta.url);
fs.mkdirSync(out, { recursive: true });

// Kinds of artwork we care about (not buildings, not photographs).
const TYPES = {
  Q3305213: "painting", Q860861: "sculpture", Q179700: "sculpture", Q241045: "sculpture", Q245117: "sculpture",
  Q93184: "drawing", Q11060274: "print", Q18218093: "print", Q134194: "painting", Q219423: "painting",
  Q133067: "object", Q184296: "textile", Q1278452: "painting", Q79218: "painting", Q144860: "painting",
  Q2334236: "painting", Q1044167: "painting", Q15123870: "print", Q125191: "sculpture",
};

async function sparql(q) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
    if (r.ok) return (await r.json()).results.bindings;
    await new Promise((res) => setTimeout(res, 3000 * (i + 1)));
  }
  throw new Error("SPARQL failed");
}

const rows = new Map();
for (const [q, kind] of Object.entries(TYPES)) {
  const b = await sparql(`SELECT ?item ?sl WHERE { ?item wdt:P31 wd:${q}; wdt:P18 ?img; wikibase:sitelinks ?sl. FILTER(?sl >= 12) }`);
  for (const x of b) {
    const id = x.item.value.split("/").pop();
    const sl = Number(x.sl.value);
    if (!rows.has(id) || rows.get(id).sitelinks < sl) rows.set(id, { qid: id, sitelinks: sl, kind });
  }
  console.error(q, kind, b.length);
}

// Details for everything that made the cut.
const ids = [...rows.values()].sort((a, b) => b.sitelinks - a.sitelinks).map((r) => r.qid);
for (let i = 0; i < ids.length; i += 150) {
  const chunk = ids.slice(i, i + 150).map((q) => "wd:" + q).join(" ");
  const b = await sparql(`SELECT ?item ?label ?creatorLabel ?creator ?inception ?collectionLabel ?locationLabel ?img ?enwiki WHERE {
    VALUES ?item { ${chunk} }
    ?item wdt:P18 ?img .
    OPTIONAL { ?item rdfs:label ?label FILTER(lang(?label)="en") }
    OPTIONAL { ?item wdt:P170 ?creator }
    OPTIONAL { ?item wdt:P571 ?inception }
    OPTIONAL { ?item wdt:P195 ?collection }
    OPTIONAL { ?item wdt:P276 ?location }
    OPTIONAL { ?enwiki schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`);
  for (const x of b) {
    const r = rows.get(x.item.value.split("/").pop());
    r.label ??= x.label?.value;
    r.creator ??= x.creatorLabel?.value;
    r.creatorQid ??= x.creator?.value.split("/").pop();
    r.inception ??= x.inception?.value?.slice(0, 5);
    r.collection ??= x.collectionLabel?.value;
    r.location ??= x.locationLabel?.value;
    r.image ??= decodeURIComponent(x.img.value.split("/").pop()).replace(/_/g, " ");
    r.enwiki ??= x.enwiki?.value;
  }
}
const ranked = [...rows.values()].sort((a, b) => b.sitelinks - a.sitelinks);
fs.writeFileSync(new URL("ranked.json", out), JSON.stringify(ranked, null, 1));
console.error("total", ranked.length);
