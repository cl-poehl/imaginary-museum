// Imports public-domain works with images from the Art Institute of Chicago and
// The Met, and writes src/data/imported.json (new movements, new artists and
// artworks in the same shape as the hand-curated data, plus image/kind/culture).
//
// Everything fetched (API responses, thumbnails) is cached in scripts/.cache so
// reruns are fast and offline-friendly. Delete that folder to refetch.
//
// Usage: node scripts/import-collection.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

// Node warns when importing the curated .ts files from a package without
// "type": "module". Harmless here.
process.removeAllListeners("warning");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE = path.join(ROOT, "scripts/.cache");
const OUT = path.join(ROOT, "src/data/imported.json");
const UA = "AIArtMuseum/0.1 (The Imaginary Museum data import; https://github.com/cl-poehl/imaginary-museum)";
const AIC_UA = "AIArtMuseum (https://github.com/cl-poehl/imaginary-museum)";
const AIC_API = "https://api.artic.edu/api/v1";
const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1";
const IIIF = "https://www.artic.edu/iiif/2";

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
const mkdirp = (d) => fs.mkdirSync(d, { recursive: true });
const readJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJSON = (f, v) => {
  mkdirp(path.dirname(f));
  fs.writeFileSync(f, JSON.stringify(v));
};

function limiter(perSec) {
  let next = 0;
  return async () => {
    const now = Date.now();
    const t = Math.max(now, next);
    next = t + 1000 / perSec;
    if (t > now) await sleep(t - now);
  };
}
const limits = { aic: limiter(8), met: limiter(3), wiki: limiter(20), img: limiter(20), iiif: limiter(1) };

// Retries network errors, 429 and 5xx with exponential backoff. The Met sits
// behind a bot filter that answers bursts with 403 for a few minutes, so for
// it (blocked403) we also wait out 403s with long pauses.
async function fetchRetry(url, init = {}, { tries = 6, gate, blocked403 = false } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    if (gate) await gate();
    let wait = 600 * 2 ** i + Math.random() * 400;
    try {
      const r = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
      if (r.status === 429 || r.status >= 500 || (blocked403 && r.status === 403)) {
        last = new Error(`HTTP ${r.status} ${url}`);
        await r.arrayBuffer().catch(() => {});
        if (r.status === 403) {
          wait = 60_000 * Math.min(i + 1, 5);
          console.log(`  403 from ${new URL(url).host}, pausing ${wait / 1000}s`);
        }
      } else return r;
    } catch (e) {
      last = e;
    }
    await sleep(wait);
  }
  throw last;
}

async function cached(file, produce) {
  if (fs.existsSync(file)) return readJSON(file);
  const v = await produce();
  if (v !== undefined && v !== null) writeJSON(file, v);
  return v;
}

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

const stripDiacritics = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) =>
  stripDiacritics(String(s || ""))
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const slug = (s) =>
  stripDiacritics(String(s || ""))
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------------------
// Curated data
// ---------------------------------------------------------------------------

const { ARTWORK_ENTRIES } = await import("../src/data/artworks.ts");
const { ARTISTS } = await import("../src/data/artists.ts");
const { MOVEMENTS } = await import("../src/data/movements.ts");
const { TRAITS } = await import("../src/data/traits.ts");
const CURATED_IMAGES = readJSON(path.join(ROOT, "src/data/images.json"));

// ---------------------------------------------------------------------------
// Fetch: Art Institute of Chicago
// ---------------------------------------------------------------------------

const AIC_FIELDS = [
  "id", "title", "artist_display", "artist_title", "artist_id", "date_display", "date_start", "date_end",
  "medium_display", "dimensions", "place_of_origin", "classification_title", "classification_titles",
  "style_title", "style_titles", "subject_titles", "term_titles", "image_id", "description",
  "short_description", "is_public_domain", "thumbnail", "color", "department_title", "department_id",
  "artwork_type_title", "is_boosted", "boost_rank", "is_on_view", "has_educational_resources",
  "has_multimedia_resources", "has_advanced_imaging", "culture", "category_titles",
];

async function aicSearch(body) {
  const file = path.join(CACHE, "aic/search", hash(JSON.stringify(body)) + ".json");
  return cached(file, async () => {
    const r = await fetchRetry(
      `${AIC_API}/artworks/search`,
      {
        method: "POST",
        headers: { "AIC-User-Agent": AIC_UA, "User-Agent": UA, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { gate: limits.aic },
    );
    if (!r.ok) throw new Error(`AIC search ${r.status}: ${await r.text()}`);
    return r.json();
  });
}

const PD_IMG = [{ term: { is_public_domain: true } }, { exists: { field: "image_id" } }];
const QUALITY_SHOULD = [
  { term: { is_boosted: { value: true, boost: 5 } } },
  { term: { is_on_view: true } },
  { term: { has_educational_resources: true } },
  { term: { has_multimedia_resources: true } },
  { term: { has_advanced_imaging: true } },
];

// [department id, how many top-ranked records to pull]
const AIC_DEPTS = [
  ["PC-10", 200], // Painting and Sculpture of Europe
  ["PC-3", 200], // Arts of the Americas (American painting + ancient Americas)
  ["PC-7", 250], // Arts of Asia
  ["PC-13", 200], // Prints and Drawings
  ["PC-4", 100], // Greece, Rome and Byzantium
  ["PC-1", 100], // Africa
  ["PC-14", 60], // Textiles
  ["PC-9", 80], // Applied Arts of Europe
];

async function fetchAIC() {
  const byId = new Map();
  const add = (rec, pool) => {
    if (!byId.has(rec.id)) byId.set(rec.id, { ...rec, _pool: pool });
  };
  // 1. Boosted (AIC's own list of its most important works).
  for (let page = 1; ; page++) {
    const j = await aicSearch({
      query: { bool: { must: [...PD_IMG, { term: { is_boosted: true } }] } },
      sort: [{ boost_rank: "asc" }],
      limit: 100,
      page,
      fields: AIC_FIELDS,
    });
    j.data.forEach((d) => add(d, "boosted"));
    if (page >= j.pagination.total_pages) break;
  }
  // 2. Top of each department, ranked by AIC's relevance boosting plus
  //    on-view / educational / multimedia flags as a proxy for importance.
  for (const [dept, n] of AIC_DEPTS) {
    for (let page = 1; (page - 1) * 100 < n; page++) {
      const j = await aicSearch({
        query: { bool: { must: [...PD_IMG, { term: { department_id: dept } }], should: QUALITY_SHOULD } },
        limit: Math.min(100, n - (page - 1) * 100),
        page,
        fields: AIC_FIELDS,
      });
      j.data.forEach((d) => add(d, dept));
    }
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// Fetch: The Met
// ---------------------------------------------------------------------------

// Skips Libraries (16), Photographs (19), Costume (8) and Musical Instruments (18).
const MET_DEPTS = [1, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 21];

async function metGet(url, file) {
  return cached(file, async () => {
    const r = await fetchRetry(url, { headers: { "User-Agent": UA } }, { gate: limits.met, tries: 14, blocked403: true });
    if (r.status === 404) return { __missing: true };
    if (!r.ok) throw new Error(`Met ${r.status} ${url}`);
    return r.json();
  });
}

async function fetchMet() {
  // Interleave departments so a partial fetch (if the bot filter stops us) is
  // still balanced across the collection.
  const perDept = [];
  for (const d of MET_DEPTS) {
    const j = await metGet(
      `${MET_API}/search?isHighlight=true&hasImages=true&departmentId=${d}&q=*`,
      path.join(CACHE, `met/search/highlights-${d}.json`),
    );
    perDept.push(j.objectIDs || []);
  }
  const seen = new Set();
  const list = [];
  for (let i = 0; perDept.some((l) => i < l.length); i++)
    for (const l of perDept) if (i < l.length && !seen.has(l[i])) seen.add(l[i]), list.push(l[i]);
  let todo = list.filter((id) => !fs.existsSync(path.join(CACHE, `met/objects/${id}.json`)));
  // Development shortcut: MET_CACHED_ONLY=1 uses whatever is already cached.
  if (process.env.MET_CACHED_ONLY && todo.length) {
    const skip = new Set(todo);
    list.splice(0, list.length, ...list.filter((id) => !skip.has(id)));
    todo = [];
  }
  if (todo.length) console.log(`  ${todo.length} of ${list.length} Met objects to fetch (slowly; the Met bot filter pauses us every ~170 requests)`);
  let done = 0;
  const objs = await mapPool(list, 1, async (id) => {
    const o = await metGet(`${MET_API}/objects/${id}`, path.join(CACHE, `met/objects/${id}.json`));
    if (++done % 250 === 0) console.log(`  met objects ${done}/${list.length}`);
    return o;
  });
  return objs.filter((o) => o && !o.__missing);
}


// ---------------------------------------------------------------------------
// New movements (only used if at least one imported work lands in them)
// ---------------------------------------------------------------------------

const wiki = (t) => `https://en.wikipedia.org/wiki/${t}`;
const NEW_MOVEMENTS = [
  {
    id: "ancient-egypt",
    name: "Ancient Egypt",
    start: -3100,
    end: 300,
    region: "Egypt",
    summary:
      "For three thousand years Egyptian art served the king, the gods and the dead. Its conventions, fixed early and revived again and again, show each part of the body from its most characteristic angle and arrange figures in registers scaled by rank. Most of what survives was made for tombs and temples, to sustain life in eternity rather than to be admired by the living, and it was carved, painted and cast with extraordinary precision.",
    hallmarks: [
      "Composite view of the human figure",
      "Hierarchical scale and ordered registers",
      "Hieroglyphs woven into the image",
      "Art made for eternity, not display",
    ],
    wiki: wiki("Art_of_ancient_Egypt"),
  },
  {
    id: "ancient-near-east",
    name: "Ancient Near East",
    start: -3500,
    end: 651,
    region: "Mesopotamia, Iran & Anatolia",
    summary:
      "Between the Tigris and Euphrates, and across the highlands of Iran and Anatolia, the first cities produced an art of kingship and worship. Sumerian votive figures stand in perpetual prayer, Assyrian palace reliefs narrate royal hunts and campaigns in crisp carved stone, and Achaemenid and Sasanian metalwork carried courtly imagery across vast empires. Guardian beasts, divine symbols and the figure of the ruler form a shared visual language that lasted for millennia.",
    hallmarks: [
      "Narrative relief carving",
      "Guardian creatures and composite beasts",
      "Imagery of kingship and conquest",
      "Cylinder seals and luxury metalwork",
    ],
    wiki: wiki("Art_of_Mesopotamia"),
  },
  {
    id: "classical-antiquity",
    name: "Greek and Roman Antiquity",
    start: -3000,
    end: 400,
    region: "Mediterranean",
    summary:
      "From Cycladic marble idols to the portrait busts of imperial Rome, the art of the ancient Mediterranean moved toward an ever more convincing image of the human body. Greek sculptors of the fifth century BCE fixed an ideal of balanced, athletic naturalism, while vase painters told the myths in lively line. Rome absorbed that legacy and added unflinching portraiture, narrative relief and a taste for copies of Greek masterpieces that spread across the empire.",
    hallmarks: [
      "The idealised human body",
      "Contrapposto and harmonious proportion",
      "Myth told on painted pottery",
      "Unflinching Roman portraiture",
    ],
    wiki: wiki("Classical_antiquity"),
  },
  {
    id: "medieval-europe",
    name: "Medieval Europe",
    start: 400,
    end: 1400,
    region: "Europe & Byzantium",
    summary:
      "For a thousand years after Rome, European art was above all an art of faith. Byzantine icons and mosaics set holy figures against fields of gold, Romanesque carvers filled church portals with visions of judgement, and Gothic workshops produced soaring stained glass, ivory devotional carvings and jewel-like illuminated manuscripts. Precious materials and symbolic colour mattered more than illusion, because these objects were meant to open a window onto the sacred.",
    hallmarks: [
      "Gold grounds and precious materials",
      "Hierarchy and symbolic colour",
      "Illuminated manuscripts",
      "Art in the service of the Church",
    ],
    wiki: wiki("Medieval_art"),
  },
  {
    id: "mannerism",
    name: "Mannerism",
    start: 1520,
    end: 1600,
    region: "Italy & Northern Europe",
    summary:
      "In the generation after Raphael and Michelangelo, artists pushed the High Renaissance ideal toward refinement and artifice. Figures grow elongated and twisting, colours turn acid and unexpected, and space becomes crowded or ambiguous. Prized at princely courts in Florence, Fontainebleau and Prague, Mannerism valued wit, virtuosity and grace over calm balance, and its restless energy carried on in the work of El Greco.",
    hallmarks: [
      "Elongated, serpentine figures",
      "Artificial, often acidic colour",
      "Compressed or ambiguous space",
      "Courtly elegance and virtuosity",
    ],
    wiki: wiki("Mannerism"),
  },
  {
    id: "neoclassicism",
    name: "Neoclassicism",
    start: 1760,
    end: 1830,
    region: "Europe & America",
    summary:
      "The excavation of Herculaneum and Pompeii and the writings of Winckelmann turned taste back toward the clarity of Greek and Roman art. Neoclassical painters and sculptors favoured crisp contours, frieze-like compositions and stories of civic virtue and sacrifice, a style that suited the ideals of the American and French revolutions and then the image-making of Napoleon's empire. Canova and Houdon gave it marble form; David and Ingres made it the language of the Paris Salon.",
    hallmarks: [
      "Clear contour and smooth finish",
      "Frieze-like, balanced compositions",
      "Subjects of virtue and sacrifice",
      "Direct borrowing from ancient sculpture",
    ],
    wiki: wiki("Neoclassicism"),
  },
  {
    id: "academic-art",
    name: "Academic Art",
    start: 1830,
    end: 1900,
    region: "France & Europe",
    summary:
      "The official art of the nineteenth-century Salons, taught at the École des Beaux-Arts and its counterparts across Europe. Academic painters trained for years drawing from casts and the live model, and produced polished history paintings, mythologies and Orientalist scenes with an invisible brush. Hugely popular and richly rewarded in their day, they became the establishment that Realists and Impressionists defined themselves against.",
    hallmarks: [
      "Flawless, polished finish",
      "Mastery of the academic nude",
      "History, myth and Orientalist subjects",
      "Success at the official Salon",
    ],
    wiki: wiki("Academic_art"),
  },
  {
    id: "hudson-river-school",
    name: "Hudson River School",
    start: 1825,
    end: 1880,
    region: "United States",
    summary:
      "America's first native school of landscape painting, founded by Thomas Cole in the Catskills and carried by Frederic Church and Albert Bierstadt to the Andes, the Arctic and the Rocky Mountains. These painters treated the wilderness as a national Eden and a sign of divine providence, pairing close study outdoors with grand, luminous studio compositions. Their panoramas celebrated a continent at the very moment settlement and industry were transforming it.",
    hallmarks: [
      "Panoramic wilderness views",
      "Luminous, often golden atmosphere",
      "Fine, detailed finish",
      "Nature as a sign of the divine",
    ],
    wiki: wiki("Hudson_River_School"),
  },
  {
    id: "chinese-art",
    name: "Chinese Art",
    start: -1600,
    end: 1912,
    region: "China",
    summary:
      "Chinese art spans more than three thousand years, from the ritual bronzes of the Shang and Zhou dynasties to the porcelain and painting of the Qing court. Bronze vessels and jades served ancestors and rulers, and tomb figures of the Han and Tang furnished the afterlife. Later, scholar-officials made ink painting and calligraphy the most admired arts, prizing personal expression and dialogue with past masters, while the imperial kilns at Jingdezhen set a standard for porcelain the whole world tried to copy.",
    hallmarks: [
      "Ritual bronzes and jades",
      "Ink painting and calligraphy as one art",
      "Allusion to earlier masters",
      "Porcelain from the imperial kilns",
    ],
    wiki: wiki("Chinese_art"),
  },
  {
    id: "japanese-art",
    name: "Classical Japanese Art",
    start: 600,
    end: 1900,
    region: "Japan",
    summary:
      "Before and alongside the popular woodblock print, Japanese art moved between devotion, courtly refinement and bold decoration. Buddhist sculpture and painting arrived from Korea and China and took on a native calm; the Heian court developed narrative handscrolls steeped in poetry; and in the Momoyama and Edo periods painters of the Kano and Rinpa schools covered folding screens with gold leaf, pines, waves and seasonal flowers. Tea ceramics and lacquer brought the same eye for asymmetry and material into everyday ritual.",
    hallmarks: [
      "Gold-leaf folding screens",
      "Seasonal imagery and poetry",
      "Asymmetry and open space",
      "Buddhist icons of quiet presence",
    ],
    wiki: wiki("Japanese_art"),
  },
  {
    id: "korean-art",
    name: "Korean Art",
    start: 300,
    end: 1910,
    region: "Korea",
    summary:
      "Korean artists absorbed Buddhist and Confucian culture from China and made it distinctly their own. The Goryeo dynasty produced celadon ceramics with a legendary jade-green glaze, often inlaid with cranes and clouds, alongside luminous Buddhist paintings. Under the Joseon dynasty taste shifted toward restraint: white porcelain, moon jars and ink painting that valued simplicity, candour and a feeling for the Korean landscape.",
    hallmarks: [
      "Jade-green celadon glaze",
      "Inlaid (sanggam) decoration",
      "Joseon white porcelain",
      "Restraint and natural ease",
    ],
    wiki: wiki("Korean_art"),
  },
  {
    id: "hindu-buddhist-art",
    name: "Hindu and Buddhist Art",
    start: -250,
    end: 1800,
    region: "South & Southeast Asia, Himalayas",
    summary:
      "Across India, the Himalayas and Southeast Asia, sculpture and painting gave visible form to gods, Buddhas and bodhisattvas for worship in temples, monasteries and household shrines. From the Greco-Buddhist carvings of Gandhara to the Chola bronzes of Tamil Nadu and the stone deities of Angkor, artists followed canonical proportions and a precise vocabulary of gestures, postures and attributes. The ideal body is smooth, full of inner breath and poised either in movement or in deep calm.",
    hallmarks: [
      "Mudras, the symbolic hand gestures",
      "Iconographic attributes for each deity",
      "Supple, breath-filled bodies",
      "Images made for worship and procession",
    ],
    wiki: wiki("Indian_art"),
  },
  {
    id: "mughal-rajput",
    name: "Mughal and Rajput Painting",
    start: 1560,
    end: 1900,
    region: "India",
    summary:
      "At the court of Akbar, Persian-trained masters and Indian painters created a new school of manuscript and album painting, joining Persian refinement to lively observation of people, animals and events. Under Jahangir and Shah Jahan, Mughal artists perfected the naturalistic portrait and the botanical study. In the Rajput kingdoms of Rajasthan and the Punjab Hills, painters answered with bold colour, flattened space and devotional images of Krishna and Radha.",
    hallmarks: [
      "Opaque watercolour and gold on paper",
      "Jewel-like detail and decorated borders",
      "Court portraits and chronicles",
      "Devotional imagery of Krishna",
    ],
    wiki: wiki("Mughal_painting"),
  },
  {
    id: "islamic-art",
    name: "Arts of the Islamic World",
    start: 650,
    end: 1900,
    region: "From Spain to India",
    summary:
      "Islamic art unites a vast territory, from Spain to India, through shared values rather than a single style. Calligraphy, the art of writing the word of God, holds the highest rank, and geometric and vegetal ornament spreads across tiles, carpets, metalwork and manuscripts in patterns that suggest infinity. Religious settings avoid figurative imagery, but the courts of Persia, the Ottoman Empire and Central Asia produced richly illustrated books of epic poetry and history.",
    hallmarks: [
      "Calligraphy as the highest art",
      "Geometric and arabesque ornament",
      "Lustreware, carpets and inlaid metal",
      "Illustrated Persian epics",
    ],
    wiki: wiki("Islamic_art"),
  },
  {
    id: "arts-of-africa",
    name: "Arts of Africa",
    start: -500,
    end: 1950,
    region: "Sub-Saharan Africa",
    summary:
      "The sculpture of sub-Saharan Africa was made to act in the world: to honour ancestors, empower rulers, heal, judge and entertain in masquerade. The terracottas of Nok, the cast heads of Ife and the brass plaques of the Benin kingdom are court art of great technical sophistication, while wooden figures and masks from the Dogon, Fang, Baule, Kongo and many other peoples balance abstraction and naturalism in forms of striking clarity. In the early twentieth century they transformed the course of European modern art.",
    hallmarks: [
      "Sculpture made for ritual use",
      "Bold simplification of form",
      "Masks performed in masquerade",
      "Royal casting in brass and bronze",
    ],
    wiki: wiki("African_art"),
  },
  {
    id: "indigenous-americas",
    name: "Indigenous Arts of the Americas",
    start: -1500,
    end: 1950,
    region: "The Americas",
    summary:
      "Long before European contact, the peoples of Mesoamerica and the Andes built cities, calendars and an art of great ambition: Olmec jade, Maya courtly carving and painted vessels, fierce Aztec stone deities, Moche portrait vessels, Nasca polychrome pottery and Andean gold worked as a sign of divine power. Across North America, Native nations carried these traditions of making into the modern era, in Pueblo pottery, Northwest Coast carving, quillwork, beadwork and painted hides. Much of this art served ritual, rulership and the bond between people, ancestors and land.",
    hallmarks: [
      "Ceramic effigy and portrait vessels",
      "Gold, jade and shell as sacred materials",
      "Animal and ancestral beings",
      "Pattern carrying identity and clan",
    ],
    wiki: wiki("Visual_arts_of_the_Indigenous_peoples_of_the_Americas"),
  },
  {
    id: "arts-of-oceania",
    name: "Arts of Oceania",
    start: 1700,
    end: 1950,
    region: "Pacific Islands",
    summary:
      "The islands of the Pacific, from New Guinea to Hawai'i and New Zealand, produced some of the most inventive sculpture anywhere. Carved ancestor figures, canoe prows, shields and ceremonial boards embody genealogy and spiritual power, built from wood, shell, fibre and pigment. Much of it was made for initiation, exchange and ceremony, and some objects were meant to be renewed or even left to decay once their work was done.",
    hallmarks: [
      "Ancestor figures and genealogy",
      "Wood combined with shell and fibre",
      "Bold, rhythmic surface pattern",
      "Objects for ceremony and exchange",
    ],
    wiki: wiki("Oceanian_art"),
  },
];

const ALL_MOVEMENTS = new Map([...MOVEMENTS, ...NEW_MOVEMENTS].map((m) => [m.id, m]));

// ---------------------------------------------------------------------------
// Artist name lists used to place European/American works in a movement when
// the museums give no style. Matched as substrings of the normalised name.
// ---------------------------------------------------------------------------

const LISTS = {
  impressionism: ["pissarro", "sisley", "cassatt", "bazille", "guillaumin", "hassam", "theodore robinson", "twachtman", "frieseke", "julian alden weir", "tarbell", "william merritt chase", "boudin", "zandomeneghi", "eva gonzales", "sorolla", "liebermann", "slevogt", "lilla cabot perry", "john leslie breck", "willard metcalf", "frank weston benson", "edmund charles tarbell", "robert vonnoh", "caillebotte", "cecilia beaux", "potthast"],
  "post-impressionism": ["signac", "toulouse lautrec", "emile bernard", "henri edmond cross", "maximilien luce", "rysselberghe", "serusier", "bonnard", "vuillard", "maurice denis", "vallotton", "henri rousseau", "lemmen", "angrand", "anquetin", "valadon", "roderic o conor", "paul ranson"],
  symbolism: ["odilon redon", "gustave moreau", "puvis de chavannes", "khnopff", "toorop", "carlos schwabe", "george frederic watts", "franz von stuck", "hodler", "segantini", "delville", "levy dhurmer", "elihu vedder", "albert pinkham ryder", "ensor", "arthur bowen davies", "whistler", "rops", "max klinger"],
  "pre-raphaelites": ["rossetti", "burne jones", "holman hunt", "ford madox brown", "arthur hughes", "frederick sandys", "evelyn de morgan", "william morris", "inchbold", "simeon solomon", "spartali"],
  realism: ["daumier", "corot", "theodore rousseau", "daubigny", "rosa bonheur", "jules breton", "bastien lepage", "winslow homer", "eakins", "fantin latour", "menzel", "repin", "leibl", "jules dupre", "troyon", "diaz de la pena", "alfred stevens", "carolus duran", "anshutz", "tanner", "bingham", "eastman johnson", "mount", "harnett", "peto", "courbet", "millet", "mancini", "jongkind", "henner", "lhermitte", "meunier", "israels", "mauve", "thomas hovenden", "john george brown", "ribot", "bonvin", "legros", "charles francois daubigny", "robert henri", "bellows", "john sloan", "george luks", "glackens", "everett shinn", "remington", "melchers"],
  "academic-art": ["bouguereau", "gerome", "cabanel", "meissonier", "alma tadema", "leighton", "delaroche", "couture", "bonnat", "lefebvre", "ary scheffer", "jean paul laurens", "tissot", "makart", "delaunay", "pierre auguste cot", "etty", "gleyre", "fromentin", "horace vernet", "vibert", "detaille", "de neuville", "gervex", "rochegrosse", "benjamin constant", "chasseriau", "carpeaux", "falguiere", "dubois", "powers", "rogers", "story", "bartholdi", "saint gaudens", "daniel chester french", "harriet hosmer", "edmonia lewis", "dore", "clesinger", "leon bonnat", "herkomer", "poynter", "waterhouse", "godward", "collier", "moreau vauthier", "merson", "bridgman", "weeks", "gerome"],
  "hudson-river-school": ["thomas cole", "frederic edwin church", "bierstadt", "durand", "cropsey", "kensett", "sanford robinson gifford", "heade", "fitz henry lane", "fitz hugh lane", "thomas moran", "whittredge", "mcentee", "david johnson", "inness", "william trost richards", "duncanson", "doughty", "william hart", "james mcdougal hart", "casilear", "haseltine", "william bradford", "thomas birch"],
  neoclassicism: ["jacques louis david", "ingres", "canova", "houdon", "thorvaldsen", "kauffman", "kauffmann", "vigee le brun", "vigee lebrun", "mengs", "batoni", "benjamin west", "greuze", "vien", "girodet", "guerin", "francois gerard", "drouais", "gilbert stuart", "copley", "peale", "flaxman", "benoist", "labille guiard", "prud hon", "prudhon", "trumbull", "vanderlyn", "sully", "raeburn", "hubert robert", "boilly", "gros", "fabre", "chinard", "clodion", "pajou", "rude", "bosio", "gibson", "greenough", "ralph earl", "rembrandt peale", "morse", "ammi phillips", "joshua johnson", "wright of derby", "zoffany"],
  romanticism: ["constable", "fuseli", "william blake", "hayez", "blechen", "dahl", "bonington", "john martin", "runge", "barye", "paul huet", "isabey", "decamps", "cogniet", "schinkel", "kersting", "carus", "koch", "overbeck", "quidor", "allston", "thomas jones", "vernet", "girtin", "cotman", "cox", "de loutherbourg", "loutherbourg", "calvert", "samuel palmer", "fromentin", "chasseriau"],
  mannerism: ["bronzino", "pontormo", "parmigianino", "rosso fiorentino", "el greco", "beccafumi", "salviati", "vasari", "giulio romano", "goltzius", "spranger", "wtewael", "cornelis van haarlem", "giambologna", "cellini", "bellange", "barocci", "zucchi", "allori", "tintoretto", "primaticcio", "niccolo dell abate", "perino del vaga", "polidoro", "arcimboldo", "savery", "jan muller", "heemskerck", "floris", "de vos", "sadeler", "matham", "saenredam", "cort", "ghisi", "luca cambiaso", "cambiaso", "sebastiano del piombo", "lotto", "correggio", "moroni", "bassano", "veronese", "clouet", "jean cousin", "goujon"],
  expressionism: ["kirchner", "nolde", "schmidt rottluff", "heckel", "pechstein", "otto mueller", "kokoschka", "modersohn becker", "barlach", "kollwitz", "jawlensky", "munter", "macke", "corinth", "beckmann", "rouault", "soutine", "feininger", "gerstl"],
  "early-abstraction": ["robert delaunay", "sonia delaunay", "kupka", "arthur dove", "picabia", "stanton macdonald wright", "morgan russell", "gleizes", "metzinger", "juan gris", "leger", "picasso", "braque", "boccioni", "balla", "severini", "larionov", "goncharova", "popova", "rodchenko", "lissitzky", "van doesburg", "arp", "taeuber", "marsden hartley", "weber"],
  "ukiyo-e": ["utamaro", "harunobu", "sharaku", "kuniyoshi", "kunisada", "eisen", "kiyonaga", "koryusai", "shunsho", "toyokuni", "yoshitoshi", "hokusai", "hiroshige", "masanobu", "moronobu", "kiyonobu", "shigenaga", "eishi", "shunei", "chikanobu", "kiyochika", "yoshitora", "hokkei", "gakutei", "toyoharu", "kiyomasu", "kaigetsudo", "shigemasa", "choki", "eizan", "kunichika", "hokuba", "shinsai", "shunko", "sukenobu", "kiyomitsu", "toyonobu", "kuninaga", "kunimasa", "kunitora", "sadahide", "yoshiiku", "kyosai"],
};
const listMatch = (name, list) => {
  const n = " " + norm(name) + " ";
  return LISTS[list].some((k) => n.includes(" " + k + " "));
};

// ---------------------------------------------------------------------------
// Culture / region
// ---------------------------------------------------------------------------

const ADJ = {
  dutch: "Netherlands", netherlandish: "Netherlands", holland: "Netherlands", flemish: "Flanders", mosan: "Flanders",
  belgian: "Belgium", french: "France", italian: "Italy", venetian: "Italy", florentine: "Italy", sienese: "Italy",
  lombard: "Italy", neapolitan: "Italy", spanish: "Spain", catalan: "Spain", german: "Germany", austrian: "Austria",
  swiss: "Switzerland", british: "Britain", english: "Britain", scottish: "Britain", welsh: "Britain", irish: "Ireland",
  american: "United States", mexican: "Mexico", peruvian: "Peru", guatemalan: "Guatemala", russian: "Russia",
  danish: "Denmark", swedish: "Sweden", norwegian: "Norway", finnish: "Finland", czech: "Bohemia", bohemian: "Bohemia",
  hungarian: "Hungary", polish: "Poland", portuguese: "Portugal", greek: "Greece", byzantine: "Byzantium",
  japanese: "Japan", chinese: "China", korean: "Korea", indian: "India", persian: "Iran", iranian: "Iran",
  turkish: "Turkey", ottoman: "Turkey", egyptian: "Egypt", canadian: "Canada", roman: "Rome", etruscan: "Etruria",
  cypriot: "Cyprus", assyrian: "Assyria", sumerian: "Mesopotamia", babylonian: "Mesopotamia", akkadian: "Mesopotamia",
  mesopotamian: "Mesopotamia", achaemenid: "Iran", sasanian: "Iran", elamite: "Iran", parthian: "Iran",
  hittite: "Anatolia", anatolian: "Anatolia", urartian: "Anatolia", phrygian: "Anatolia", minoan: "Greece",
  cycladic: "Greece", mycenaean: "Greece", helladic: "Greece", attic: "Greece", corinthian: "Greece",
  laconian: "Greece", boeotian: "Greece", euboean: "Greece", "east greek": "Greece", "south italian": "Greece",
  apulian: "Greece", campanian: "Greece", lucanian: "Greece", coptic: "Egypt", tibetan: "Tibet", nepalese: "Nepal",
  nepali: "Nepal", thai: "Thailand", cambodian: "Cambodia", khmer: "Cambodia", "pre angkorean": "Cambodia",
  vietnamese: "Vietnam", cham: "Vietnam", javanese: "Indonesia", indonesian: "Indonesia", "sri lankan": "Sri Lanka",
  burmese: "Myanmar", gandharan: "Pakistan", syrian: "Syria", phoenician: "Levant", levantine: "Levant",
  "ancient eastern mediterranean": "Levant", moroccan: "Morocco", mughal: "India", rajput: "India",
  timurid: "Iran", safavid: "Iran", qajar: "Iran", mamluk: "Egypt", nasrid: "Spain", manchu: "China",
  "franco american": "United States", bactrian: "Central Asia", "south netherlandish": "Flanders",
  "north netherlandish": "Netherlands", european: "Europe", "western european": "Europe", "anglo saxon": "Britain",
  frankish: "France", merovingian: "France", carolingian: "France", visigothic: "Spain", langobardic: "Italy",
  ostrogothic: "Italy", celtic: "Celtic Europe", "east germanic": "Germanic Europe", germanic: "Germanic Europe",
  viking: "Scandinavia", scandinavian: "Scandinavia", ottonian: "Germany", rhenish: "Germany", "upper rhenish": "Germany",
  mosan: "Flanders", "hispano moresque": "Spain", taino: "Caribbean",
};
// Peoples / cultures that the museums use instead of a country.
const PEOPLES = {
  edo: "Nigeria", yoruba: "Nigeria", igbo: "Nigeria", ife: "Nigeria", nok: "Nigeria", "benin kingdom": "Nigeria", ijo: "Nigeria",
  dogon: "Mali", bamana: "Mali", bankoni: "Mali", djenne: "Mali", senufo: "Côte d'Ivoire", baule: "Côte d'Ivoire",
  dan: "Côte d'Ivoire", guro: "Côte d'Ivoire", fang: "Gabon", kota: "Gabon", punu: "Gabon", kongo: "DR Congo",
  vili: "Republic of the Congo", kuba: "DR Congo", luba: "DR Congo", songye: "DR Congo", pende: "DR Congo",
  yaka: "DR Congo", luluwa: "DR Congo", mangbetu: "DR Congo", hemba: "DR Congo", chokwe: "Angola", asante: "Ghana",
  akan: "Ghana", bamileke: "Cameroon", bamum: "Cameroon", mende: "Sierra Leone", sapi: "Sierra Leone",
  swahili: "Kenya", "ait ouaouzguite": "Morocco", zulu: "South Africa", sakalava: "Madagascar",
  moche: "Peru", nasca: "Peru", nazca: "Peru", chimu: "Peru", inca: "Peru", wari: "Peru", lambayeque: "Peru",
  chavin: "Peru", paracas: "Peru", recuay: "Peru", tiwanaku: "Bolivia", maya: "Mesoamerica", olmec: "Mexico",
  aztec: "Mexico", mexica: "Mexico", mixtec: "Mexico", zapotec: "Mexico", teotihuacan: "Mexico", totonac: "Mexico",
  huastec: "Mexico", colima: "Mexico", nayarit: "Mexico", jalisco: "Mexico", "west mexico": "Mexico",
  veracruz: "Mexico", cocle: "Panama", diquis: "Costa Rica", tairona: "Colombia", quimbaya: "Colombia",
  calima: "Colombia", sinu: "Colombia", muisca: "Colombia", "ancestral pueblo": "United States",
  mimbres: "United States", asmat: "Papua New Guinea", sepik: "Papua New Guinea", abelam: "Papua New Guinea",
  iatmul: "Papua New Guinea", maori: "New Zealand", hawaiian: "Hawai'i", "rapa nui": "Rapa Nui",
  marquesan: "Marquesas Islands", fijian: "Fiji", tongan: "Tonga", samoan: "Samoa", "solomon islands": "Solomon Islands",
  "new ireland": "Papua New Guinea", "new guinea": "Papua New Guinea", "papua": "Papua New Guinea",
  "torres strait": "Australia", "aboriginal": "Australia", "vanuatu": "Vanuatu", "austral islands": "Austral Islands",
  "cook islands": "Cook Islands", "mangareva": "French Polynesia", "tahiti": "French Polynesia",
};
const PLACES = {
  "United States": ["united states", "new york city", "new york", "philadelphia", "boston", "chicago", "florida", "ohio", "roxbury", "newport", "connecticut", "wilmington", "maine", "gloucester", "salem", "middlebury", "cambridge", "new england", "ipswich", "illinois", "new hampshire", "massachusetts", "baltimore", "providence", "saint louis", "missouri", "long island", "nantucket island", "york harbor", "prouts neck", "niagara falls", "southwest", "new mexico", "pueblo of acoma", "pueblo of zia", "pennsylvania", "virginia", "new jersey", "rhode island", "maryland", "kentucky", "california", "hudson river"],
  Canada: ["canada", "british columbia"],
  France: ["france", "paris", "lyon", "brittany", "trouville", "saint remy de provence", "sevres", "beauvais", "jouy en josas", "limoges", "normandy", "arles", "giverny", "aix en provence", "chantilly", "tours", "rouen", "argenteuil", "vetheuil", "burgundy", "champagne", "provence"],
  Netherlands: ["netherlands", "holland", "delft", "amsterdam", "haarlem", "leiden", "utrecht", "the hague"],
  Flanders: ["flanders", "antwerp", "brussels", "bruges", "ghent", "southern netherlands", "tournai", "mechelen"],
  Belgium: ["belgium"],
  Britain: ["england", "london", "chelsea", "greenwich", "wales", "scotland", "great britain", "united kingdom", "staffordshire", "worcester", "derby", "bristol"],
  Ireland: ["ireland", "dublin"],
  Italy: ["italy", "venice", "florence", "milan", "naples", "lucca", "northern italy", "frascati", "siena", "bologna", "genoa", "urbino", "faenza", "deruta", "gubbio", "mantua", "ferrara", "padua", "verona", "turin", "castel durante", "rome"],
  Spain: ["spain", "seville", "madrid", "toledo", "valencia", "ripoll", "catalonia", "granada", "manises"],
  Portugal: ["portugal", "lisbon"],
  Germany: ["germany", "augsburg", "munich", "nuremberg", "cologne", "ulm", "neuwied", "meissen", "northern germany", "berlin", "dresden", "frankfurt", "nymphenburg", "hochst", "frankenthal"],
  Austria: ["austria", "vienna"],
  Switzerland: ["switzerland", "zurich", "basel", "geneva"],
  Scandinavia: ["scandinavia"], Caribbean: ["caribbean", "dominican republic", "puerto rico", "hispaniola"],
  Norway: ["norway"], Denmark: ["denmark", "copenhagen"], Sweden: ["sweden"], Russia: ["russia", "saint petersburg", "moscow"],
  Bohemia: ["bohemia", "prague"], Hungary: ["hungary"], Poland: ["poland"],
  Peru: ["peruvian north coast", "peruvian south coast", "peru", "lambayeque valley", "trujillo", "cuzco", "cusco", "lima", "andes"],
  Mexico: ["puebla", "mexico", "tenochtitlan", "teotihuacan", "campeche state", "veracruz state", "jalisco state", "nayarit state", "western mexico", "valley of mexico", "remojadas", "colima", "oaxaca", "new spain", "yucatan", "chiapas", "guerrero"],
  Guatemala: ["peten", "guatemala"], Panama: ["veraguas", "panama"], "Costa Rica": ["costa rica"], Colombia: ["colombia"],
  Ecuador: ["ecuador"], Bolivia: ["bolivia"], Honduras: ["honduras"],
  India: ["india", "nagapattinam", "tamil nadu", "odisha", "orissa", "madhya pradesh", "andhra pradesh", "rajasthan", "karnataka", "uttar pradesh", "gujarat", "punjab hills", "bengal", "kashmir", "mathura", "deccan", "bihar", "kerala", "himachal pradesh", "maharashtra", "mewar", "udaipur", "jaipur", "bikaner", "kota", "bundi", "kishangarh", "lucknow", "agra", "delhi", "golconda", "bijapur"],
  Pakistan: ["gandhara", "pakistan", "ancient region of gandhara", "lahore"],
  Nepal: ["nepal", "kathmandu valley"], Tibet: ["tibet", "central tibet", "western tibet"], Cambodia: ["cambodia", "angkor"],
  Thailand: ["thailand"], Indonesia: ["java", "central java", "eastern java", "indonesia", "bali", "sumatra"],
  Myanmar: ["myanmar", "burma"], Vietnam: ["vietnam"], Bangladesh: ["bangladesh"], "Sri Lanka": ["sri lanka"],
  "Southeast Asia": ["southeast asia"],
  China: ["china", "northern china", "hunan", "henan", "shaanxi", "hebei", "jiangxi", "jingdezhen", "zhejiang", "jiangsu", "sichuan", "gansu", "shanxi", "shandong", "anhui", "fujian", "guangdong", "yunnan", "inner mongolia"],
  Japan: ["japan", "kyoto", "edo", "tokyo", "osaka", "arita", "nara", "kamakura"],
  Korea: ["korea"], Mongolia: ["mongolia"],
  Iran: ["iran", "tabriz", "isfahan", "shiraz", "herat", "kashan", "nishapur", "qazvin", "mashhad"],
  Iraq: ["iraq", "baghdad", "mosul", "samarra", "nimrud", "nineveh", "ur", "uruk", "nippur"],
  Syria: ["syria", "damascus", "aleppo", "raqqa"], Turkey: ["turkey", "istanbul", "iznik", "bursa", "ushak"],
  Levant: ["levant", "tyre", "eastern mediterranean region", "eastern mediterranean", "lebanon", "israel", "palestine", "jordan"],
  "Central Asia": ["uzbekistan", "samarqand", "samarkand", "bukhara", "afghanistan", "turkmenistan", "central asia", "eurasia", "eurasian steppes"],
  Egypt: ["egypt", "saqqara", "thebes", "al fayyum", "fayum", "alexandria", "old cairo", "cairo", "memphis", "abydos", "lisht", "deir el bahri", "amarna", "giza", "upper egypt", "lower egypt"],
  Greece: ["athens", "kea", "corinth", "samos", "piraeus", "greece", "ancient greece", "apulia", "ephesus", "attica", "boeotia", "crete", "cyclades", "rhodes", "sparta", "macedonia", "south italy", "magna graecia", "sicily", "taranto"],
  Rome: ["roman empire", "antioch", "pompeii", "herculaneum", "boscoreale", "ostia", "tivoli"],
  Etruria: ["etruria", "vulci", "cales", "cerveteri", "tarquinia", "chiusi"],
  Cyprus: ["cyprus"],
  Nigeria: ["nigeria", "ikere", "benin city", "ife", "owo"], Mali: ["mali"], Ethiopia: ["ethiopia"],
  "DR Congo": ["democratic republic of the congo", "dr congo", "zaire"], "Republic of the Congo": ["republic of the congo"],
  Kenya: ["kenya"], Gabon: ["gabon"], Cameroon: ["cameroon"], Angola: ["angola"], Algeria: ["algeria"],
  Morocco: ["morocco", "fez", "marrakesh"], Ghana: ["ghana"], "Côte d'Ivoire": ["cote d ivoire", "ivory coast"],
  "Sierra Leone": ["sierra leone"], "Burkina Faso": ["burkina faso"], Madagascar: ["madagascar"], "South Africa": ["south africa"],
  Sudan: ["sudan", "nubia"], Tanzania: ["tanzania"], Zimbabwe: ["zimbabwe"], Guinea: ["guinea"], Liberia: ["liberia"],
  "Papua New Guinea": ["papua new guinea", "new guinea", "new ireland", "new britain", "sepik"], "New Zealand": ["new zealand"],
  "Hawai'i": ["hawaii", "hawai i", "hawaiian islands"], "Solomon Islands": ["solomon islands"], Vanuatu: ["vanuatu"],
  Fiji: ["fiji"], "Rapa Nui": ["easter island", "rapa nui"], "Marquesas Islands": ["marquesas islands"], "Cook Islands": ["cook islands"],
  "French Polynesia": ["french polynesia", "tahiti", "society islands", "austral islands"], Australia: ["australia"],
  Tonga: ["tonga"], Samoa: ["samoa"],
};
const PLACE_INDEX = new Map();
for (const [country, keys] of Object.entries(PLACES)) for (const k of keys) PLACE_INDEX.set(k, country);

const REGIONS = {
  Europe: ["Netherlands", "Flanders", "Belgium", "France", "Italy", "Spain", "Portugal", "Germany", "Austria", "Switzerland", "Britain", "Ireland", "Norway", "Denmark", "Sweden", "Finland", "Russia", "Bohemia", "Hungary", "Poland", "Greece", "Rome", "Etruria", "Cyprus", "Byzantium", "Scandinavia", "Celtic Europe", "Germanic Europe", "Europe"],
  "North America": ["United States", "Canada"],
  "Latin America": ["Caribbean", "Mexico", "Peru", "Guatemala", "Panama", "Costa Rica", "Colombia", "Ecuador", "Bolivia", "Honduras", "Mesoamerica"],
  "East Asia": ["China", "Japan", "Korea", "Mongolia"],
  "South & Southeast Asia": ["India", "Pakistan", "Nepal", "Tibet", "Cambodia", "Thailand", "Indonesia", "Myanmar", "Vietnam", "Bangladesh", "Sri Lanka", "Southeast Asia"],
  "Middle East & North Africa": ["Egypt", "Iran", "Iraq", "Syria", "Turkey", "Levant", "Mesopotamia", "Assyria", "Anatolia", "Arabia", "Central Asia", "Morocco", "Algeria"],
  "Sub-Saharan Africa": ["Nigeria", "Mali", "Ethiopia", "DR Congo", "Republic of the Congo", "Kenya", "Gabon", "Cameroon", "Angola", "Ghana", "Côte d'Ivoire", "Sierra Leone", "Burkina Faso", "Madagascar", "South Africa", "Sudan", "Tanzania", "Zimbabwe", "Guinea", "Liberia", "Africa"],
  Oceania: ["Papua New Guinea", "New Zealand", "Hawai'i", "Solomon Islands", "Vanuatu", "Fiji", "Rapa Nui", "Marquesas Islands", "Cook Islands", "French Polynesia", "Australia", "Tonga", "Samoa", "Oceania"],
};
const REGION_OF = new Map();
for (const [r, list] of Object.entries(REGIONS)) for (const c of list) REGION_OF.set(c, r);
const regionOf = (culture) => REGION_OF.get(culture) || "Other";

// Tries every comma/paren separated piece of each string, most specific first.
function placeFrom(...texts) {
  for (const t of texts) {
    if (!t) continue;
    const parts = String(t).split(/[,;()/|]|\.\s| or | and /).map(norm).filter(Boolean);
    for (const p of parts) {
      if (PLACE_INDEX.has(p)) return PLACE_INDEX.get(p);
      if (ADJ[p]) return ADJ[p];
      if (PEOPLES[p]) return PEOPLES[p];
    }
    for (const p of parts) {
      const ws = p.split(" ");
      for (let i = 1; i < ws.length; i++) {
        const tail = ws.slice(i).join(" ");
        const hit = PLACE_INDEX.get(tail) || ADJ[tail] || PEOPLES[tail];
        if (hit) return hit;
      }
    }
    for (const p of parts) {
      const words = p.replace(/\b(ancient|peoples?|probably|possibly|present day|culture|style|region of|northern|southern|eastern|western|central|north|south|east|west|northeast|northwest|southeast|southwest|upper|lower)\b/g, " ").replace(/\s+/g, " ").trim();
      if (PLACE_INDEX.has(words)) return PLACE_INDEX.get(words);
      if (ADJ[words]) return ADJ[words];
      if (PEOPLES[words]) return PEOPLES[words];
      const first = words.split(" ")[0];
      if (ADJ[first]) return ADJ[first];
      for (const [k, v] of Object.entries(PEOPLES)) if (words.includes(k) && k.length > 3) return v;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Kinds
// ---------------------------------------------------------------------------

const FIGURE_RX =
  /\b(figure|figures|figurine|statue|statuette|bust|head|torso|relief|stele|stela|buddha|bodhisattva|deity|god|goddess|shiva|vishnu|ganesha|parvati|krishna|mask|portrait|equestrian|standing|seated|kneeling|reclining|guardian|votive|effigy|idol|nkisi|reliquary guardian|virgin|christ|saint|madonna|angel|apostle|luohan|arhat|tara|avalokiteshvara|jina|harihara|durga|nataraja|power figure|ancestor)\b/i;
const MANUSCRIPT_RX = /\b(codex|codices|manuscript|book of hours|psalter|gospels?|bible|qur.?an|leaf from|page from|folio from a|folio from an illustrated|illuminat|choir ?book|antiphonary|missal|breviary|calligraph)/i;
const TEXTILE_RX = /\b(textile|tapestr|carpet|rug|costume|embroider|quilt|sampler|coverlet|lace|robe|kimono|kesi|velvet|hanging|tunic|mantle|shawl|sash|cloth|kosode|uchikake|chasuble|cope|dalmatic)/i;
const FABRIC_RX = /\b(silk|cotton|wool|linen|velvet|embroider|tapestr|brocade|satin|damask|felt|bark cloth|raffia|feathers)/i;

function kindOfAIC(r) {
  const t = r.artwork_type_title || "";
  const title = r.title || "";
  const med = r.medium_display || "";
  if (/Photograph|Installation|Miniature room|Coin|Architectural Drawing|Model|Film|Video|Digital|Sound/i.test(t)) return null;
  if (/photograph|albumen|gelatin silver/i.test(med)) return null;
  if (/Painting/i.test(t)) return MANUSCRIPT_RX.test(title + " " + med) ? "manuscript" : "painting";
  if (/Drawing/i.test(t)) return "drawing";
  if (/Print/i.test(t)) return "print";
  if (/Book/i.test(t)) return "manuscript";
  if (/Sculpture|Mask/i.test(t)) return "sculpture";
  if (/Textile|Coverings|Hangings/i.test(t)) return "textile";
  if (/Costume/i.test(t)) return FABRIC_RX.test(med) ? "textile" : "object";
  if (/Religious|Ritual|Funerary|Architectural fragment/i.test(t) && FIGURE_RX.test(title)) return "sculpture";
  return "object";
}

function kindOfMet(o) {
  const cls = o.classification || "";
  const on = o.objectName || "";
  const blob = `${cls} | ${on}`;
  const title = o.title || "";
  const med = o.medium || "";
  if (/photograph/i.test(blob) || /photograph|albumen|gelatin silver/i.test(med)) return null;
  if (MANUSCRIPT_RX.test(`${blob} | ${title}`) && !/album/i.test(title + on)) return "manuscript";
  if (/textile|tapestr|carpet|rug|costume|featherwork/i.test(cls)) return "textile";
  if (/\bpaintings?\b/i.test(cls) || /^(painting|hanging scroll|handscroll|folding screen|pair of .*screens|album leaf|fan|icon|triptych|diptych|altarpiece|miniature|single leaf|watercolor, miniature)/i.test(on) || /\bpainting\b/i.test(on))
    return "painting";
  if (/\bprints?\b|woodblock|etching|engraving|lithograph|woodcut|mezzotint|aquatint|drypoint/i.test(blob)) return "print";
  if (/drawing|watercolor|pastel|gouache/i.test(blob)) return "drawing";
  if (TEXTILE_RX.test(on) || (FABRIC_RX.test(med) && !/\b(ink|paint|watercolor|pigment|gouache|tempera|oil)\b/i.test(med))) return "textile";
  if (/sculpture|statue|statuette|figure|figurine|bust|head|relief|stela|stele|mask|torso|idol|reliquary|crucifix|corpus/i.test(blob)) return "sculpture";
  if (!cls && !on && FIGURE_RX.test(title)) return "sculpture";
  return "object";
}
const GROUP_OF = { painting: "P", print: "W", drawing: "W", sculpture: "S", object: "S", textile: "O", manuscript: "O" };

// ---------------------------------------------------------------------------
// Text cleanup
// ---------------------------------------------------------------------------

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
const noEmDash = (s) =>
  String(s || "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*([.,;:!?])/g, "$1")
    .replace(/^,\s*/, "");
const clean = (s) => noEmDash(decodeEntities(String(s || "")).replace(/\s+/g, " ").trim());
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const ABBREV = /(?:\b(?:c|ca|St|Sts|Mr|Mrs|Ms|Dr|no|No|nos|vol|fig|figs|pl|cat|inv|Jr|Sr|Mt|Ft|approx|B\.C|A\.D|b|d|fl)|\b[A-Z])\.$/;
function splitSentences(text) {
  const out = [];
  let cur = "";
  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    cur += tokens[i];
    const tok = tokens[i];
    if (/[.!?]["”’)]*$/.test(tok) && !ABBREV.test(tok.replace(/["”’)]+$/, ""))) {
      const next = tokens.slice(i + 1).find((t) => t.trim());
      if (!next || /^["“‘(]?[A-Z0-9]/.test(next)) {
        out.push(cur.trim());
        cur = "";
      }
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function makeBlurb(html) {
  if (!html) return "";
  const text = clean(html.replace(/<\/p>\s*<p>/gi, " ").replace(/<[^>]+>/g, " "));
  if (!text) return "";
  const sents = splitSentences(text);
  const out = [];
  let words = 0;
  for (const s of sents) {
    const w = s.split(/\s+/).length;
    if (out.length >= 3 || (out.length && words + w > 70)) break;
    if (!out.length && w > 90) return "";
    out.push(s);
    words += w;
  }
  const b = out.join(" ");
  return /[.!?]["”’)]*$/.test(b) ? b : "";
}

// Year display in the site's style ("c. 1665", "1897–98", "c. 1350 BCE").
function yearDisplay(text, begin, end) {
  const y = yearDisplayRaw(text, begin, end).replace(/\b(mid)–/gi, "$1-").replace(/\bmid (\d)/gi, "mid-$1");
  return /^[a-z]/.test(y) && !/^c\. /.test(y) ? cap1(y) : y;
}
function yearDisplayRaw(text, begin, end) {
  let t = clean(text)
    .replace(/\b(ca\.|circa|about|approximately|approx\.)\s*/gi, "c. ")
    .replace(/\bB\.\s?C\.(\s?E\.)?|\bBCE\b|\bBC\b/g, "BCE")
    .replace(/\bA\.\s?D\.\s?|\bAD\b\s?|\bCE\b\s?/g, "")
    .replace(/\s*[-–]\s*/g, "–")
    .replace(/\s+/g, " ")
    .trim();
  const plain = /^(c\. )?(\d{1,4})(–(c\. )?\d{1,4})?( BCE)?$/.test(t) || /^\d{4}\/\d{2,4}$/.test(t);
  if (/^\d{4}\/\d{2,4}$/.test(t)) t = t.replace("/", "–");
  if (plain) return t;
  const cent = t.match(/((?:early|mid|late|first half of the|second half of the|first quarter of the|last quarter of the)[\s-]*)?\d{1,2}(?:st|nd|rd|th)(?:[–/]\d{1,2}(?:st|nd|rd|th))?\s+(?:century|centuries|millennium)(?: BCE)?/i);
  if (cent && t.length > 24) return cent[0].replace(/^mid\s+/i, "mid-").replace(/\/(\d)/, "–$1");
  if (t.length <= 24 && /\d/.test(t)) return t.replace(/^(\w)/, (m) => m);
  if (begin == null) return t;
  const fmt = (y) => (y < 0 ? `${-y} BCE` : `${y}`);
  if (begin === end || end == null) return fmt(begin);
  if (begin < 0 && end < 0) return `c. ${-begin}–${-end} BCE`;
  if (begin < 0) return `c. ${-begin} BCE–${end} CE`;
  if (end - begin <= 40) return `c. ${begin}–${end}`;
  return `c. ${Math.round((begin + end) / 2)}`;
}

function dimsDisplay(s) {
  const t = clean(s).replace(/\s*x\s*/g, " × ");
  const cm = t.match(/(?:[A-Za-z.]+\s)?[\d.,]+(?:\s*×\s*[\d.,]+){0,2}\s*cm/);
  const out = cm ? cm[0].replace(/^\(/, "").replace(/(\d),(\d)/g, "$1.$2") : t.split(/[;\n]/)[0].slice(0, 80);
  return cap1(out.replace(/(\d)cm\b/g, "$1 cm").replace(/\s*×\s*/g, " × ").trim());
}

// Short, readable title (drops romanised originals in parentheses for East
// Asian works, and long "also known as" clauses).
function displayTitle(title, culture) {
  let t = clean(title).replace(/^["“]([^"”]+)["”],?\s*/, "$1, ").replace(/,\s*$/, "");
  if (["Japan", "China", "Korea"].includes(culture)) {
    const s = t.replace(/\s*\([^)]*\)/g, "").replace(/\s+,/g, ",").trim();
    if (s.length > 3) t = s;
  }
  t = t.replace(/[　-鿿가-힯]+/g, "").replace(/\s{2,}/g, " ").trim();
  // Drop life dates of sitters and the verso of double-sided sheets.
  t = t.replace(/\s*\((?:born |died |ca?\.\s*)?[^()]*\d{3,4}[^()]*\)/g, "").replace(/\s*\(recto\).*$/i, "").replace(/;\s*\((?:verso|reverse)\).*$/i, "").trim();
  if (t.length > 90) {
    const m = t.slice(12).search(/; |: | \(/);
    if (m >= 0) t = t.slice(0, m + 12);
  }
  if (t.length > 90) {
    const m = t.slice(20).search(/, /);
    if (m >= 0) t = t.slice(0, m + 20);
  }
  return t.replace(/[,;:\s]+$/, "");
}

// ---------------------------------------------------------------------------
// Curated artists and works (for reuse and de-duplication)
// ---------------------------------------------------------------------------

const CURATED_ALIASES = {
  "guo-xi": ["guo xi"], "jan-van-eyck": ["jan van eyck"], botticelli: ["botticelli"], bosch: ["hieronymus bosch"],
  leonardo: ["leonardo da vinci"], durer: ["albrecht durer"], raphael: ["raphael", "raffaello sanzio"],
  titian: ["titian", "tiziano vecellio"], holbein: ["hans holbein the younger"],
  bruegel: ["pieter bruegel the elder", "pieter bruegel i", "pieter bruegel"], caravaggio: ["caravaggio"],
  "artemisia-gentileschi": ["artemisia gentileschi"], heda: ["willem claesz heda", "willem claesz  heda"],
  velazquez: ["velazquez"], rembrandt: ["rembrandt"], vermeer: ["johannes vermeer", "jan vermeer"], watteau: ["antoine watteau", "jean antoine watteau"],
  fragonard: ["jean honore fragonard"], goya: ["goya"], friedrich: ["caspar david friedrich"],
  turner: ["joseph mallord william turner", "j m w turner"], gericault: ["gericault"], delacroix: ["eugene delacroix"],
  millet: ["jean francois millet"], courbet: ["gustave courbet"], bocklin: ["arnold bocklin"], millais: ["john everett millais"],
  manet: ["edouard manet"], degas: ["edgar degas"], cezanne: ["paul cezanne"], monet: ["claude monet"],
  morisot: ["berthe morisot"], renoir: ["auguste renoir"], gauguin: ["paul gauguin"], caillebotte: ["gustave caillebotte"],
  waterhouse: ["john william waterhouse"], "van-gogh": ["vincent van gogh"], sargent: ["john singer sargent"],
  seurat: ["georges seurat"], "af-klint": ["hilma af klint"], klimt: ["gustav klimt"], munch: ["edvard munch"],
  kandinsky: ["kandinsky"], mondrian: ["piet mondrian"], malevich: ["kazimir malevich"], marc: ["franz marc"],
  schiele: ["egon schiele"], hokusai: ["katsushika hokusai"], hiroshige: ["utagawa hiroshige", "ando hiroshige"],
};
const NOT_CURATED = /\b(peale|polidoro|ii|iii|school|workshop|follower|circle|pupil|imitator|copy|after|manner)\b/;
function curatedArtistId(name) {
  if (!name) return null;
  const n = " " + norm(name) + " ";
  if (NOT_CURATED.test(n)) return null;
  for (const [id, aliases] of Object.entries(CURATED_ALIASES))
    if (aliases.some((a) => n.includes(" " + a + " "))) return id;
  return null;
}
const CURATED_ARTIST = new Map(ARTISTS.map((a) => [a.id, a]));

const STOP = new Set("the a an of and in on at to with from for by la le les de du des der die das il lo el no sanjurokkei".split(" "));
const titleTokens = (t) => new Set(norm(t).split(" ").filter((w) => w && !STOP.has(w)));
const CURATED_TITLES = ARTWORK_ENTRIES.map((w) => ({ artist: w.artist, tokens: titleTokens(w.title), id: w.id }));
function isCuratedDuplicate(title, curatedId) {
  if (!curatedId) return false;
  const tt = titleTokens(title);
  return CURATED_TITLES.some(
    (c) => c.artist === curatedId && [...c.tokens].every((w) => tt.has(w)) || (c.artist === curatedId && tt.size >= 2 && [...tt].every((w) => c.tokens.has(w))),
  );
}

// ---------------------------------------------------------------------------
// Normalise museum records into one candidate shape
// ---------------------------------------------------------------------------

const SKIP_ATTRIB = /\b(workshop of|follower of|circle of|style of|copy after|after|manner of|school of|imitator of|studio of|pupil of)\b/i;

function parseLifeLine(line) {
  // "Dutch, 1853–1890" | "Italian, Florence 1445–1510 Florence" | "active ca. 1440–65" | "French, born 1790"
  const out = { nationality: "", birthplace: "", born: null, died: null, approxB: false, approxD: false, active: false };
  if (!line) return out;
  const l = clean(line).replace(/\s*[-–]\s*/g, "–");
  const comma = l.indexOf(",");
  const head = comma > 0 ? l.slice(0, comma).trim() : "";
  if (head && !/\d/.test(head) && head.split(" ").length <= 4) out.nationality = head;
  const rest = comma > 0 ? l.slice(comma + 1).trim() : l;
  const m = rest.match(/(active\s+)?(?:(ca\.|c\.|about|born)\s*)?(-?\d{3,4})(?:\s*(?:BCE|B\.C\.))?(?:–(?:(ca\.|c\.|about)\s*)?(\d{1,4}))?/i);
  if (m) {
    out.active = !!m[1] || /\bactive\b/i.test(rest.slice(0, m.index));
    out.approxB = /ca|c\.|about/i.test(m[2] || "");
    out.born = +m[3];
    if (m[5]) {
      let d = m[5];
      if (d.length < m[3].length) d = m[3].slice(0, m[3].length - d.length) + d;
      out.died = +d;
      out.approxD = !!m[4];
    }
    const before = rest.slice(0, m.index).replace(/[,;\s]+$/, "").trim();
    if (before && !/active|born|died|probably/i.test(before) && before.length < 40) out.birthplace = before;
  }
  return out;
}

function fromAIC(r, agents) {
  const kind = kindOfAIC(r);
  const lines = (r.artist_display || "").split("\n").map((s) => s.trim());
  const agent = r.artist_id ? agents[r.artist_id] : null;
  const agentType = agent?.agent_type_title || "";
  const anonymous = !r.artist_id || /Culture|Unknown/i.test(agentType) || /^(artist unknown|unknown|anonymous)/i.test(r.artist_title || "");
  const life = parseLifeLine(lines.slice(1).join(", ") || (lines[0].match(/\(([^)]*\d[^)]*)\)/)?.[1] ?? ""));
  if (!life.born && agent?.birth_date) life.born = agent.birth_date;
  if (!life.died && agent?.death_date) life.died = agent.death_date;
  const style = [r.style_title, ...(r.style_titles || [])].filter(Boolean).join(" | ");
  const islamic = /islamic/i.test(r.artist_title || "") || /islamic/i.test(style);
  let culture;
  if (r.department_id === "PC-4" || anonymous) culture = placeFrom(r.artist_title, r.place_of_origin, lines[0], style);
  else culture = placeFrom(life.nationality, r.place_of_origin, lines[0]);
  culture ||= placeFrom(r.place_of_origin, style) || clean(r.place_of_origin) || "Unknown";
  const NATIVE_RX = /pueblo|native american|navajo|dine|lakota|sioux|hopi|zuni|acoma|cheyenne|tlingit|haida|kwakwaka|tsimshian|inuit|yup.ik|anishinaabe|ojibwa|cree|apache|mohawk|haudenosaunee|iroquois|seminole|osage|kiowa|comanche|blackfoot|plains|mississippian|hopewell|mimbres|ancestral pueblo|san ildefonso|santa clara|cochiti|zia|laguna|pomo|chumash|salish|arapaho|crow|shoshone|nez perce|menominee|winnebago|ho-chunk|potawatomi|delaware|lenape/i;
  const ancientAmericas =
    r.department_id === "PC-3" &&
    (/Culture/i.test(agentType) || (r.date_end ?? 9999) < 1550 || NATIVE_RX.test(`${r.artist_display} ${r.place_of_origin} ${style} ${r.title}`));
  return {
    origin: "aic",
    oid: r.id,
    key: `aic-${r.id}`,
    url: `https://www.artic.edu/artworks/${r.id}`,
    rawTitle: r.title,
    artistName: anonymous ? null : clean(r.artist_title || lines[0]),
    artistLine: lines[0],
    anonymous,
    life,
    wikidata: null,
    dateText: r.date_display,
    begin: r.date_start,
    end: r.date_end,
    medium: r.medium_display || "",
    dimensions: r.dimensions || "",
    kind,
    culture,
    islamic,
    indigenous: ancientAmericas,
    dept: r.department_title || "",
    style,
    text: [r.title, r.classification_title, ...(r.subject_titles || []), ...(r.term_titles || []), r.artwork_type_title, style]
      .filter(Boolean)
      .join(" | "),
    blurbSrc: r.short_description || r.description || "",
    skipAttrib: SKIP_ATTRIB.test(lines[0] || ""),
    publicDomain: !!r.is_public_domain,
    priority: r.is_boosted ? 100 - Math.min(40, (r.boost_rank || 200) / 8) : (r._score || 0) > 5000 ? 72 : 35 + Math.min(15, (r._score || 0) / 8),
    img: { aic: r.image_id, w: r.thumbnail?.width, h: r.thumbnail?.height },
  };
}

function fromMet(o) {
  const kind = kindOfMet(o);
  const name = clean(o.artistDisplayName || "");
  const anonymous =
    !name || /^(unknown|anonymous|unidentified)/i.test(name) || /\bartists?(\(s\))?$/i.test(name) || /author|poet|publisher|patron|owner|donor/i.test(o.artistRole || "");
  const life = parseLifeLine(o.artistDisplayBio || "");
  life.nationality = clean((o.artistNationality || life.nationality || "").split(/[,;(]/)[0]);
  if (!life.born && /^\d{3,4}$/.test(o.artistBeginDate || "")) life.born = +o.artistBeginDate;
  if (!life.died && /^\d{3,4}$/.test(o.artistEndDate || "") && o.artistEndDate !== "9999") life.died = +o.artistEndDate;
  const dept = o.department || "";
  const islamic = dept === "Islamic Art";
  let culture = null;
  if (dept === "Egyptian Art") culture = "Egypt";
  else if (dept === "Greek and Roman Art") culture = placeFrom(o.culture) || "Greece";
  else if (dept === "Ancient West Asian Art" || dept === "Ancient Near Eastern Art") culture = placeFrom(o.culture, o.country, o.region) || "Mesopotamia";
  else if (islamic) culture = placeFrom(o.country, o.culture, o.region, o.city) || "Iran";
  else if (dept === "Asian Art" || dept === "Arts of Africa, Oceania, and the Americas" || anonymous)
    culture = placeFrom(o.culture, o.country, o.region, o.subregion, o.city, life.nationality);
  else culture = placeFrom(life.nationality, o.culture, o.country, o.city);
  culture ||= placeFrom(o.country, o.region, o.culture, name) || clean(o.culture || o.country) || "Unknown";
  if (culture === "Unknown") {
    if (dept === "The American Wing") culture = "United States";
    else if (/European|Lehman|Medieval|Cloisters|Arms and Armor|Drawings and Prints/.test(dept)) culture = "Europe";
  }
  if (dept === "Arts of Africa, Oceania, and the Americas" && culture === "Unknown") culture = /oceania|pacific|melanesia|polynesia|micronesia/i.test(o.region + o.culture) ? "Oceania" : "Africa";
  const indigenous = /native american|pre-columbian/i.test(`${o.culture} ${o.artistNationality} ${o.region}`) ||
    (dept === "Arts of Africa, Oceania, and the Americas" && REGION_OF.get(culture) === "Latin America") ||
    (dept === "Arts of Africa, Oceania, and the Americas" && culture === "United States");
  return {
    origin: "met",
    oid: o.objectID,
    key: `met-${o.objectID}`,
    url: o.objectURL || `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
    rawTitle: o.title || o.objectName || "",
    artistName: anonymous ? null : name,
    artistLine: `${o.artistPrefix || ""} ${name}`.trim(),
    anonymous,
    life,
    wikidata: o.artistWikidata_URL || (o.constituents || [])[0]?.constituentWikidata_URL || null,
    dateText: o.objectDate,
    begin: o.objectBeginDate,
    end: o.objectEndDate,
    medium: o.medium || "",
    dimensions: o.dimensions || "",
    kind,
    culture,
    islamic,
    indigenous,
    dept,
    style: [o.period, o.dynasty, o.culture].filter(Boolean).join(" | "),
    text: [o.title, o.objectName, o.classification, o.culture, o.period, ...(o.tags || []).map((t) => t.term)].filter(Boolean).join(" | "),
    blurbSrc: "",
    skipAttrib: SKIP_ATTRIB.test(o.artistPrefix || "") || SKIP_ATTRIB.test(o.attributionQualifier || ""),
    publicDomain: !!o.isPublicDomain && !!o.primaryImage,
    priority: 60 + (o.isTimelineWork ? 12 : 0) + (o.objectWikidata_URL ? 10 : 0) + (o.GalleryNumber ? 4 : 0),
    img: { large: o.primaryImage, small: o.primaryImageSmall },
  };
}

// ---------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------

const NON_WESTERN = new Set([
  "song-landscape", "ukiyo-e", "ancient-egypt", "ancient-near-east", "chinese-art", "japanese-art", "korean-art",
  "hindu-buddhist-art", "mughal-rajput", "islamic-art", "arts-of-africa", "indigenous-americas", "arts-of-oceania",
]);
const STYLE_MAP = [
  [/post impressionis|neo impressionis|pointillis|nabis/, "post-impressionism"],
  [/impressionis/, "impressionism"],
  [/pre raphaelite/, "pre-raphaelites"],
  [/symbolis/, "symbolism"],
  [/expressionis/, "expressionism"],
  [/barbizon|realis/, "realism"],
  [/romanticis/, "romanticism"],
  [/neoclassic|federal/, "neoclassicism"],
  [/rococo|louis xv\b/, "rococo"],
  [/baroque|louis xiv/, "baroque"],
  [/mannerism/, "mannerism"],
  [/hudson river/, "hudson-river-school"],
  [/academic/, "academic-art"],
  [/secession|jugendstil/, "vienna-secession"],
  [/de stijl|suprematis|abstract/, "early-abstraction"],
];
const inRange = (m, d, slack = 15) => {
  const mv = ALL_MOVEMENTS.get(m);
  return mv && d >= mv.start - slack && d <= mv.end + slack;
};
const LATE_LISTS = ["pre-raphaelites", "hudson-river-school", "impressionism", "post-impressionism", "symbolism", "academic-art", "realism", "expressionism", "early-abstraction"];
const LANDSCAPE_RX = /landscape|mountain|river|valley|falls|lake|forest|woods|view of|sunset|twilight|wilderness|coast|shore|harbor|meadow|autumn|morning|storm|scene/i;

function europeanMovement(c, d) {
  const name = c.artistName || "";
  const n = norm(c.style);
  for (const [rx, m] of STYLE_MAP) if (rx.test(n) && inRange(m, d)) return m;
  if (d >= 1500 && d <= 1620 && listMatch(name, "mannerism")) return "mannerism";
  if (d >= 1750 && d <= 1850) {
    if (listMatch(name, "neoclassicism")) return "neoclassicism";
    if (listMatch(name, "romanticism")) return "romanticism";
  }
  if (d >= 1825 && d <= 1935) for (const l of LATE_LISTS) if (listMatch(name, l) && inRange(l, d, 25)) return l;
  const cu = c.culture;
  const italyish = ["Italy", "Spain", "Portugal"].includes(cu);
  const pictorial = ["painting", "drawing", "print"].includes(c.kind);
  if (d < 400) return ["Greece", "Rome", "Etruria", "Cyprus"].includes(cu) ? "classical-antiquity" : null;
  if (d < 1400) return "medieval-europe";
  if (d < 1520) return italyish ? "italian-renaissance" : "northern-renaissance";
  if (d < 1600) {
    if (italyish) return d < 1530 || !pictorial ? "italian-renaissance" : "mannerism";
    return d < 1585 ? "northern-renaissance" : "mannerism";
  }
  if (d < 1720) return cu === "Netherlands" && d <= 1700 ? "dutch-golden-age" : "baroque";
  if (d < 1770) return "rococo";
  if (d < 1830) {
    if (!pictorial || ["United States", "France"].includes(cu) || regionOf(cu) === "Latin America") return "neoclassicism";
    return d < 1790 ? "rococo" : "romanticism";
  }
  if (cu === "Austria" && d >= 1897 && d <= 1918) return "vienna-secession";
  if (c.kind === "sculpture" && d < 1915) return "academic-art";
  if (d < 1900) {
    if (!pictorial) return null;
    if (cu === "United States" && d < 1880 && c.kind === "painting" && LANDSCAPE_RX.test(c.rawTitle)) return "hudson-river-school";
    return d < 1845 ? "romanticism" : "realism";
  }
  if (d <= 1930 && pictorial && ["Germany", "Austria"].includes(cu)) return "expressionism";
  return null;
}

function assignMovement(c, curatedId) {
  const d = c.date;
  const cu = c.culture;
  const reg = regionOf(cu);
  if (curatedId) {
    const ms = CURATED_ARTIST.get(curatedId).movements;
    if (ms.length === 1) return ms[0];
    return ms.find((m) => inRange(m, d, 0)) || ms[0];
  }
  if (c.dept === "Arts of Greece, Rome, and Byzantium" || c.dept === "Greek and Roman Art") {
    if (cu === "Egypt" && d < 400) return "ancient-egypt";
    if (cu === "Byzantium" || d >= 400) return "medieval-europe";
    if (!["Mesopotamia", "Assyria", "Iran", "Anatolia"].includes(cu)) return "classical-antiquity";
  }
  if (cu === "Egypt") return c.islamic || d >= 640 ? "islamic-art" : d >= 400 ? "medieval-europe" : "ancient-egypt";
  if (reg === "Middle East & North Africa") return c.islamic || d >= 650 ? "islamic-art" : d < 700 ? "ancient-near-east" : null;
  if (["Greece", "Rome", "Etruria", "Cyprus"].includes(cu) && d < 500) return "classical-antiquity";
  if (cu === "Byzantium") return "medieval-europe";
  if (cu === "China")
    return c.kind === "painting" && d >= 960 && d <= 1127 && LANDSCAPE_RX.test(c.text) ? "song-landscape" : "chinese-art";
  if (cu === "Japan") {
    if ((c.kind === "print" || listMatch(c.artistName || "", "ukiyo-e")) && d >= 1670 && d <= 1900) return "ukiyo-e";
    return d <= 1900 ? "japanese-art" : null;
  }
  if (cu === "Korea") return "korean-art";
  if (cu === "Mongolia") return "chinese-art";
  if (reg === "South & Southeast Asia") {
    if (["India", "Pakistan"].includes(cu) && ["painting", "manuscript", "drawing"].includes(c.kind) && d >= 1500) return "mughal-rajput";
    if (c.islamic) return "islamic-art";
    return "hindu-buddhist-art";
  }
  if (reg === "Sub-Saharan Africa") return "arts-of-africa";
  if (reg === "Oceania") return "arts-of-oceania";
  if (c.indigenous || (reg === "Latin America" && d < 1550)) return "indigenous-americas";
  if (c.islamic) return "islamic-art";
  return europeanMovement(c, d);
}

// ---------------------------------------------------------------------------
// Measured colour (on a 64px version of the cached thumbnail)
// ---------------------------------------------------------------------------

function srgbToLab(r, g, b) {
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Mean lightness (L*), mean chroma (C*) and warmth (projection of a*/b* onto
// the orange-blue axis). For objects photographed on a plain backdrop the
// backdrop is masked out first.
async function colorStats(file, maskBackground) {
  const { data, info } = await sharp(file)
    .resize(64, 64, { fit: "inside" })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const px = [];
  const border = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const lab = srgbToLab(data[i], data[i + 1], data[i + 2]);
      px.push(lab);
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) border.push(lab);
    }
  let use = px;
  let masked = false;
  if (maskBackground) {
    const mean = [0, 1, 2].map((k) => border.reduce((s, p) => s + p[k], 0) / border.length);
    const dE = (p) => Math.hypot(p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]);
    const spread = border.reduce((s, p) => s + dE(p), 0) / border.length;
    if (spread < 10) {
      const fg = px.filter((p) => dE(p) > 14);
      if (fg.length > px.length * 0.08) (use = fg), (masked = true);
    }
  }
  const n = use.length;
  const L = use.reduce((s, p) => s + p[0], 0) / n;
  const C = use.reduce((s, p) => s + Math.hypot(p[1], p[2]), 0) / n;
  const warm = use.reduce((s, p) => s + 0.5 * p[1] + 0.866 * p[2], 0) / n;
  return { L: +L.toFixed(1), C: +C.toFixed(1), warm: +warm.toFixed(1), masked };
}

// Thresholds calibrated against the hand-tagged curated works (their 500px
// Wikimedia thumbnails: every curated "shadow" work measures L* <= 28, most
// "luminous" ones >= 45; "warm"/"cool" overlap between 5 and 14 because old
// varnish makes almost everything a little warm) and then set so that roughly
// the outer quarter of the imported distribution on each side gets a trait.
// Values in the middle produce nothing. Works on paper and 3D objects use their own rules because
// paper tone and studio backdrops would otherwise dominate.
const COLOR = {
  flat: { luminous: 55, shadow: 30, warm: 17, cool: 7, vivid: 22, muted: 10, minC: 6 },
  paper: { luminous: Infinity, shadow: 30, warm: 16, cool: 4, vivid: 24, muted: 12, minC: 18 },
  threeD: { luminous: Infinity, shadow: -Infinity, warm: 14, cool: 1.5, vivid: 18, muted: 4, minC: 3 },
};

function colorTraits(st, kind) {
  const th = kind === "print" || kind === "drawing" ? COLOR.paper : kind === "sculpture" || kind === "object" ? COLOR.threeD : COLOR.flat;
  const t = [];
  if (st.L >= th.luminous) t.push("luminous");
  else if (st.L <= th.shadow) t.push("shadow");
  if (st.C >= th.minC) {
    if (st.warm >= th.warm) t.push("warm");
    else if (st.warm <= th.cool) t.push("cool");
  }
  if (st.C >= th.vivid) t.push("vivid");
  else if (st.C <= th.muted) t.push("muted");
  return t;
}

// ---------------------------------------------------------------------------
// Traits (only ids from src/data/traits.ts)
// ---------------------------------------------------------------------------

const RX = {
  portrait: /\bportrait|self-portrait|self portrait|\bbust of|\bportrait head|\bhead of (a |an )?(man|woman|youth|boy|girl|king|queen|emperor|ruler|priest|official)|\bportraits\b/i,
  portraitTitle: /^(mrs?\.?|madame|mme\.?|mademoiselle|mlle\.?|miss|lady|lord|sir|count|countess|duke|duchess|king|queen|prince|princess|emperor|empress|the artist|dr\.?|general|cardinal|pope)\b/i,
  nude: /\bnudes?\b|\bbathers?\b|\bodalisque|\bvenus\b|\baphrodite|\bfemale nudes|\bmale nudes|\bbathing\b/i,
  sacred: /\b(buddha|buddhas|bodhisattva|christ|jesus|virgin|madonna|mary magdalene|saints?|st\. |crucifix|crucifixion|annunciation|nativity|adoration|holy family|holy|resurrection|lamentation|pieta|pietà|entombment|apostles?|evangelist|angels?|biblical|bible|gospel|qur.?an|koran|mihrab|mosque|temple|shrine|reliquary|altar|icon|shiva|vishnu|krishna|radha|ganesha|devi|parvati|durga|lakshmi|tara|avalokiteshvara|guanyin|kannon|amida|jizo|luohan|arhat|lama|mandala|jina|tirthankara|horus|osiris|isis|amun|anubis|sekhmet|hathor|ptah|thoth|bastet|deity|deities|goddess|god\b|gods\b|religious|ritual|sacred|prophet|moses|abraham|david and|judith|john the baptist|baptism|last supper|trinity|monk|nun|pilgrim|mass\b|devotional|paradise|heaven|hell|last judgment|demon|kami|hanuman|rama\b|sita|brahma|nataraja|yaksha|yakshi|naga|stupa|sutra|mandapa)\b/i,
  myth: /\b(myth|mythology|mythological|zeus|jupiter|hera|juno|apollo|athena|minerva|artemis|diana|hercules|herakles|dionysos|dionysus|bacchus|bacchante|bacchanal|mars|ares|mercury|hermes|cupid|eros|psyche|nymphs?|satyrs?|centaurs?|medusa|perseus|orpheus|leda|europa|danae|danaë|andromeda|pan\b|neptune|poseidon|triton|nereid|amazons?|achilles|odysseus|ulysses|trojan|troy|helen|paris and|narcissus|daphne|ganymede|prometheus|sphinx|griffin|dragon|phoenix|legend|shahnama|shahnameh|khamsa|ramayana|mahabharata|tale of genji|genji|heike|chushingura|faun|muses?|graces|endymion|galatea|pygmalion|adonis|actaeon|io\b|ariadne|theseus|minotaur|jason|argonauts|vulcan|saturn|chronos|aurora|flora|pomona|ceres|demeter|persephone|proserpina|hades|pluto|ovid|arthurian|lancelot|valkyrie|siren|mermaid)\b/i,
  history: /\b(battle|war|wars|siege|surrender|revolution|coronation|execution|death of (general|the)|assassination|napoleon|washington crossing|washington|lincoln|capture|conquest|campaign|treaty|signing|emperor .* receiving|history|historical|battles|soldiers?|army|troops|cavalry|samurai|warriors?|hunt|hunting|triumph of|procession of the emperor|embassy|delegation)\b/i,
  stillLife: /still life|still-life|vase of flowers|flowers in a|bouquet|\bfruit\b|peonies|vanitas|\bflowers\b|\bfruits\b|dead game|breakfast piece|banquet piece/i,
  landscape: /landscape|mountains?|valley|view of|views of|forest|woods|snow|garden|cityscape|panorama|waterfall|\bfalls\b|countryside|\bhills\b|\bfields?\b|poplars|haystacks|wheatstacks|cliffs|sunset|sunrise|moonlight|stations of the|eight views|famous places|meisho|scenery|gorge|\blake\b|\briver\b|seascape|streams and mountains|travelers among/i,
  water: /\bsea\b|seascape|seascapes|\bocean|\bwaves?\b|harbou?r|\brivers?\b|\blakes?\b|\bponds?\b|\bboats?\b|\bships?\b|\bshore\b|\bbeach|\bcoast|\bbay\b|\bmarine\b|fishing|fishermen|\bcanal|waterfall|water lil|waterlil|\brain\b|lagoon|\bport of|seine|thames|venice|grand canal|bridge over|ferry|sailing|regatta|\bwater\b|shipwreck|whale|fisherman/i,
  everyday: /interior|interiors|domestic|genre|market|street|streets|dance|dancer|dancers|ballet|caf[eé]|laundress|reading|\bletter\b|kitchen|harvest|peasants?|children|child|family|game|games|music|musician|musicians|concert|theater|theatre|actors?|kabuki|courtesans?|beauties|bijin|picnic|boating|circus|races|farm|daily life|women|girls?|boys?|mother|seamstress|card players|toilette|sewing|bath\b|tea\b|teahouse|parlor|school|gossip|lovers|courtship|flirtation|milliner|washerwomen|gleaners|workers|laborers|sowers?|shepherd|cowherd|merchants?|tavern|inn\b|feast|party|festival|entertainment|leisure|umbrella|promenade|stroll|opera|night life|chess|horse race/i,
  nonfigurative: /\b(carpet|rug|quilt|coverlet|tiles?|textile fragment|fragment of a textile|panel|abstraction|abstract|geometric|pattern|ornament)\b/i,
  dramatic: /\b(battle|storm|shipwreck|massacre|fight|fighting|combat|attack|attacking|struggle|wrestl|fury|furious|death of|crucifixion|martyrdom|rape of|abduction|slaughter|killing|beheading|judith|drowning|avalanche|fire|burning|eruption|tiger|lion hunt|thunder|tempest|flood|war|siege|conflict|violence|slaying|vanquish|triumph)\b/i,
  melancholy: /\b(mourning|mourners?|lament|lamentation|grief|sorrow|melanchol|pieta|pietà|entombment|widow|ruins?|funeral|elegy|solitude|abandoned|dying|dead christ|deposition|tomb of|farewell|nostalg)\b/i,
  joyful: /\b(festival|dance|dancing|party|picnic|celebration|feast|merry|merrymaking|carnival|fête|fete|play|playing|games|laughing|revel|revelers|wedding|holiday|kermis|blossom viewing|cherry blossoms?|flower viewing|pleasure|amusement|fair\b)\b/i,
  intimate: /\b(mother and child|madonna and child|virgin and child|lovers?|kiss|toilette|bath|bathing|bedroom|letter|embrace|caress|nursing|sleeping|asleep|reading|reverie|intimate|couple|lullaby|cradle)\b/i,
  uncanny: /\b(demons?|ghosts?|skulls?|monsters?|witch|witches|nightmare|skeleton|hell|dream|apparition|specter|spectre|vampire|devil|phantom|spirit of|oni|yokai|goblin|chimera|grotesque|macabre|death and)\b/i,
  serene: /\b(meditation|meditating|dhyana|dhyanamudra|calm|tranquil|repose|quiet|stillness|peaceful|serene|contemplat|evening|moonlight|twilight|dawn|mist|misty|snow|seated buddha|rest|resting|idyll|pastoral)\b/i,
  crowded: /\b(procession|battle|crowd|crowds|market|festival|parade|assembly|triumph|feast|fair|gathering|multitude|army|armies|throng|banquet|kermis|court of|audience|reception|carnival|many|hundreds|thousand)\b/i,
  symbolic: /\b(allegory|allegorical|vanitas|emblem|emblematic|symbol|symbolic|memento mori|personification|virtues|vices|five senses|four seasons|four elements|ages of man)\b/i,
  gold: /\bgold\b|\bgilt\b|\bgilded\b|\bgilding\b|gold leaf|parcel-gilt|ormolu/i,
};

const NATURALISTIC_MOVES = new Set(["italian-renaissance", "northern-renaissance", "baroque", "dutch-golden-age", "realism", "academic-art", "neoclassicism", "hudson-river-school", "pre-raphaelites", "romanticism"]);
const STYLIZED_MOVES = new Set(["ancient-egypt", "ancient-near-east", "medieval-europe", "arts-of-africa", "arts-of-oceania", "indigenous-americas", "ukiyo-e", "islamic-art", "mughal-rajput", "korean-art", "chinese-art", "japanese-art", "hindu-buddhist-art", "mannerism", "symbolism", "expressionism", "early-abstraction", "post-impressionism", "vienna-secession", "song-landscape"]);
const PAINTERLY_MOVES = new Set(["impressionism", "post-impressionism", "expressionism"]);
const PRECISE_MOVES = new Set(["northern-renaissance", "medieval-europe", "academic-art", "neoclassicism", "pre-raphaelites", "mughal-rajput", "hudson-river-school"]);
const SINGLE_FIGURE_RX = /\b(figure|statue|statuette|bust|head|torso|buddha|bodhisattva|portrait|seated|standing|kneeling|reclining|goddess|god|deity|saint|virgin|warrior|guardian)\b/i;
const MULTI_RX = /\b(figures|group|pair|couple|and|with attendants|family|procession|triad)\b/i;

function deriveTraits(c) {
  const text = `${c.rawTitle} | ${c.text}`;
  const title = c.rawTitle || "";
  const k = c.kind;
  const pictorial = ["painting", "print", "drawing", "manuscript"].includes(k);
  const threeD = k === "sculpture" || k === "object";
  const subj = [];
  const add = (t) => !subj.includes(t) && subj.length < 2 && subj.push(t);

  const isPortrait = RX.portrait.test(text) || (pictorial && RX.portraitTitle.test(title)) || (k === "sculpture" && /\b(bust|portrait head|head of)\b/i.test(title));
  if (isPortrait) add("portrait");
  if (RX.nude.test(text) && !/draped/i.test(title)) add("nude");
  if (RX.sacred.test(text)) add("sacred");
  if (RX.myth.test(text)) add("myth");
  if (pictorial || k === "textile") {
    if (!subj.includes("sacred") && RX.history.test(text)) add("history");
    if (RX.stillLife.test(title) || /still life/i.test(c.text)) add("still-life");
    if ((/\blandscapes?\b/i.test(c.text) || RX.landscape.test(title)) && !isPortrait) add("landscape");
    if (RX.water.test(title) || /\b(seascapes|marine|rivers|boats|ships|harbors|water)\b/i.test(c.text)) add("water");
    if (!subj.length && RX.everyday.test(text)) add("everyday");
  } else if (RX.history.test(title)) add("history");
  if (!subj.length && (k === "textile" || k === "object") && RX.nonfigurative.test(title) && !FIGURE_RX.test(title)) add("nonfigurative");

  const mood = [];
  const addMood = (t) => mood.length < 2 && !mood.includes(t) && mood.push(t);
  if (subj.includes("sacred")) addMood("spiritual");
  if (RX.dramatic.test(title)) addMood("dramatic");
  if (RX.melancholy.test(title)) addMood("melancholy");
  if (RX.uncanny.test(title)) addMood("uncanny");
  if (RX.joyful.test(title)) addMood("joyful");
  if (RX.intimate.test(title) && pictorial) addMood("intimate");
  if (subj.includes("nude") && !subj.includes("sacred") && pictorial) addMood("sensual");
  if (RX.serene.test(title)) addMood("serene");

  const colour = c.color ? colorTraits(c.color, k) : [];

  let handling = null;
  const med = c.medium || "";
  if (k === "print") {
    if (/woodblock|woodcut|wood-block|wood block/i.test(med) && regionOf(c.culture) === "East Asia") handling = "flat";
    else if (/engraving|etching|drypoint|mezzotint|aquatint|woodcut|burin/i.test(med)) handling = "precise";
    else if (/color lithograph|colour lithograph|lithograph.*colou?r/i.test(med)) handling = "flat";
  } else if (k === "drawing") {
    if (/pastel/i.test(med) || (/watercolor/i.test(med) && PAINTERLY_MOVES.has(c.movement))) handling = "painterly";
    else if (/\bpen\b|silverpoint|metalpoint|graphite|pencil/i.test(med)) handling = "precise";
  } else if (k === "painting") {
    if (PAINTERLY_MOVES.has(c.movement) && c.artistKey !== "seurat") handling = "painterly";
    else if (PRECISE_MOVES.has(c.movement)) handling = "precise";
    else if (c.movement === "ukiyo-e" || /rinpa|rimpa/i.test(text)) handling = "flat";
  } else if (k === "manuscript") handling = "precise";

  let form = null;
  if (c.movement === "classical-antiquity") form = c.date < -600 ? "stylized" : "naturalistic";
  else if (NATURALISTIC_MOVES.has(c.movement)) form = threeD && c.kind === "object" ? null : "naturalistic";
  else if (STYLIZED_MOVES.has(c.movement)) form = "stylized";

  const extra = [];
  if (RX.gold.test(med)) extra.push("gold");
  const comp = [];
  if (RX.crowded.test(title)) comp.push("crowded");
  else if ((k === "sculpture" && SINGLE_FIGURE_RX.test(title) && !MULTI_RX.test(title)) || (subj[0] === "portrait" && !MULTI_RX.test(title)))
    comp.push("solitary");
  if (RX.symbolic.test(text)) comp.push("symbolic");

  // Sparse works (often objects with mid-range colour) get a relaxed colour
  // reading against the median of their kind, so every work carries a few
  // visual traits for the taste model.
  if (subj.length + colour.length + (form ? 1 : 0) + (handling ? 1 : 0) + extra.length < 4 && c.color) {
    const med = { flat: { L: 40, warm: 13, C: 15 }, paper: { L: 63, warm: 12, C: 14 }, threeD: { L: 53, warm: 4.3, C: 6.2 } }[
      k === "print" || k === "drawing" ? "paper" : threeD ? "threeD" : "flat"
    ];
    const has = (g) => colour.some((t) => TRAITS[t].group === g);
    if (!has("temperature") && k !== "print" && k !== "drawing") {
      if (c.color.warm >= med.warm + 2) colour.push("warm");
      else if (c.color.warm <= med.warm - 2) colour.push("cool");
    }
    if (!has("intensity")) {
      if (c.color.C >= med.C + 3) colour.push("vivid");
      else if (c.color.C <= med.C - 2) colour.push("muted");
    }
    if (!has("light") && !threeD) {
      if (c.color.L >= med.L + 10 && k !== "print" && k !== "drawing") colour.push("luminous");
      else if (c.color.L <= med.L - 10) colour.push("shadow");
    }
  }

  // Priority order when trimming to 7.
  const ordered = [...subj, ...extra, ...(form ? [form] : []), ...(handling ? [handling] : []), ...colour, ...mood, ...comp];
  const out = [...new Set(ordered)].filter((t) => TRAITS[t]).slice(0, 7);
  return out;
}

// ---------------------------------------------------------------------------
// Images: resolve URLs, verify, cache thumbnails, measure colour
// ---------------------------------------------------------------------------

const IMG_HEADERS = { "User-Agent": UA };
const VERIFY_TTL = 7 * 24 * 3600 * 1000;

const gateFor = (url) => (url.includes("artic.edu/iiif") ? limits.iiif : limits.img);

async function httpStatus(url, method = "GET") {
  const file = path.join(CACHE, "verify", hash(method + url) + ".json");
  if (fs.existsSync(file)) {
    const v = readJSON(file);
    if (Date.now() - v.t < VERIFY_TTL) return v.status;
  }
  let status = 0;
  try {
    const r = await fetchRetry(url, { method, headers: IMG_HEADERS }, { gate: gateFor(url), tries: 4 });
    status = r.status;
    await r.body?.cancel().catch(() => {});
  } catch {
    status = 0;
  }
  // Only remember definitive answers; a 403 from a bot filter is not one.
  if (status === 200 || status === 404 || status === 410) writeJSON(file, { status, t: Date.now() });
  return status;
}

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 500) return true;
  try {
    const r = await fetchRetry(url, { headers: IMG_HEADERS }, { gate: gateFor(url), tries: 4 });
    if (r.status !== 200) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).metadata(); // throws if not an image
    mkdirp(path.dirname(file));
    fs.writeFileSync(file, buf);
    writeJSON(path.join(CACHE, "verify", hash("GET" + url) + ".json"), { status: 200, t: Date.now() });
    return true;
  } catch {
    return false;
  }
}

// Reads pixel dimensions of a (possibly huge) remote JPEG from its first bytes.
async function remoteDims(url, file) {
  return cached(file, async () => {
    for (const bytes of [131071, 1048575]) {
      try {
        const r = await fetchRetry(url, { headers: { ...IMG_HEADERS, Range: `bytes=0-${bytes}` } }, { gate: limits.img, tries: 4 });
        if (r.status !== 206 && r.status !== 200) return { status: r.status };
        const buf = Buffer.from(await r.arrayBuffer());
        const m = await sharp(buf).metadata();
        if (m.width && m.height) {
          const rotate = m.orientation >= 5;
          return { status: 200, width: rotate ? m.height : m.width, height: rotate ? m.width : m.height };
        }
      } catch {}
    }
    return { status: 0 };
  });
}

const MIN_ASPECT = 0.3;
const MAX_ASPECT = 3.0;

// If the AIC image server starts answering with bot challenges (403), stop
// asking it (repeated requests only prolong the block) and let the Met
// backfill. The summary reports this loudly.
let iiif403 = 0;
const IIIF_BREAKER = 3;

async function prepareImage(c) {
  let image;
  let thumbFile;
  if (c.origin === "aic") {
    if (iiif403 >= IIIF_BREAKER) return { fail: "AIC image server blocked (403)" };
    const id = c.img.aic;
    // The search API already reports the full image size; only ask IIIF when it is missing.
    const info = c.img.w && c.img.h ? { width: c.img.w, height: c.img.h } : await cached(path.join(CACHE, "aic/iiif", id + ".json"), async () => {
      const r = await fetchRetry(`${IIIF}/${id}/info.json`, { headers: { ...IMG_HEADERS, "AIC-User-Agent": AIC_UA } }, { gate: limits.iiif, tries: 4 });
      if (r.status === 403) console.log(`\n  403 from IIIF for ${id}; the AIC image server may be rate limiting`);
      return r.ok ? r.json() : null;
    });
    if (!info?.width) return { fail: "no IIIF info" };
    const W = info.width, H = info.height;
    if (Math.max(W, H) < 700) return { fail: "image too small" };
    const aspect = W / H;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return { fail: `extreme aspect ${aspect.toFixed(2)}` };
    let lw = W >= 1686 ? 1686 : W >= 843 ? 843 : W;
    let src = `${IIIF}/${id}/full/${lw},/0/default.jpg`;
    let st = await httpStatus(src);
    if (st === 403) {
      iiif403++;
      return { fail: "AIC image server blocked (403)" };
    }
    iiif403 = 0;
    if (st !== 200 && lw > 843) {
      lw = 843;
      src = `${IIIF}/${id}/full/843,/0/default.jpg`;
      st = await httpStatus(src);
    }
    if (st !== 200) return { fail: "large image not 200" };
    const tw = Math.min(500, W);
    const thumb = `${IIIF}/${id}/full/${tw},/0/default.jpg`;
    thumbFile = path.join(CACHE, "img/aic", `${id}.jpg`);
    if (!(await download(thumb, thumbFile))) return { fail: "thumb not 200" };
    if ((await httpStatus(thumb)) !== 200) return { fail: "thumb not 200" };
    image = { src, thumb, width: lw, height: Math.round((H * lw) / W), source: c.url };
  } else {
    const { large, small } = c.img;
    if (!small && !large) return { fail: "no image" };
    thumbFile = path.join(CACHE, "img/met", `${c.oid}.jpg`);
    const thumb = small || large;
    if (!(await download(thumb, thumbFile))) return { fail: "thumb not 200" };
    if ((await httpStatus(thumb)) !== 200) return { fail: "thumb not 200" };
    let src = large;
    let dims = large ? await remoteDims(large, path.join(CACHE, "met/dims", `${c.oid}.json`)) : { status: 0 };
    if (dims.status !== 200 || (await httpStatus(large, "HEAD")) !== 200) {
      const m = await sharp(thumbFile).metadata();
      src = thumb;
      dims = { width: m.width, height: m.height };
    }
    const aspect = dims.width / dims.height;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return { fail: `extreme aspect ${aspect.toFixed(2)}` };
    if (Math.max(dims.width, dims.height) < 700) return { fail: "image too small" };
    image = { src, thumb, width: dims.width, height: dims.height, source: c.url };
  }
  const threeD = ["sculpture", "object", "textile"].includes(c.kind);
  const color = await colorStats(thumbFile, threeD);
  return { image, thumbFile, color };
}

// ---------------------------------------------------------------------------
// Wikipedia / Wikidata
// ---------------------------------------------------------------------------

async function wikiSummary(title) {
  const t = title.replace(/ /g, "_");
  return cached(path.join(CACHE, "wiki", slug(t) + "-" + hash(t).slice(0, 6) + ".json"), async () => {
    const r = await fetchRetry(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`, { headers: { "User-Agent": UA } }, { gate: limits.wiki, tries: 4 });
    if (!r.ok) return { status: r.status };
    const j = await r.json();
    return { status: 200, type: j.type, title: j.title, description: j.description || "", extract: j.extract || "", url: j.content_urls?.desktop?.page || "" };
  });
}

async function wikidataEnwiki(qids) {
  const out = {};
  const list = [...new Set(qids)];
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const j = await cached(path.join(CACHE, "wikidata", hash(batch.join("|")) + ".json"), async () => {
      const r = await fetchRetry(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join("|")}&props=sitelinks&sitefilter=enwiki&format=json`,
        { headers: { "User-Agent": UA } },
        { gate: limits.wiki, tries: 4 },
      );
      return r.ok ? r.json() : null;
    });
    for (const [q, e] of Object.entries(j?.entities || {})) if (e.sitelinks?.enwiki) out[q] = e.sitelinks.enwiki.title;
  }
  return out;
}

const ART_RX = /\b(painter|artist|sculptor|printmaker|engraver|etcher|draughtsman|draftsman|illustrator|designer|potter|ceramicist|calligrapher|architect|woodblock|ukiyo-e|silversmith|goldsmith|cabinetmaker|furniture|glass|lithographer|miniaturist|watercolou?rist|decorator|craftsman|jeweller|jeweler|medallist|carver|vase painter|manufactory|porcelain|workshop|company|firm|weaver|embroiderer)\b/i;

async function resolveWiki(name, born, enwikiTitle) {
  if (enwikiTitle) {
    const s = await wikiSummary(enwikiTitle);
    if (s.status === 200 && s.type === "standard") return s.url;
  }
  if (!name) return "";
  for (const t of [name, `${name} (artist)`, `${name} (painter)`]) {
    const s = await wikiSummary(t);
    if (s.status !== 200 || s.type !== "standard") continue;
    const text = `${s.description} ${s.extract}`;
    const artsy = ART_RX.test(text);
    const yearOk = !born || [born - 1, born, born + 1].some((y) => text.includes(String(y)));
    if (artsy && yearOk) return s.url;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("Fetching Art Institute of Chicago…");
const aicRaw = await fetchAIC();
console.log(`  ${aicRaw.length} AIC records`);
const agentIds = [...new Set(aicRaw.map((r) => r.artist_id).filter(Boolean))];
const agents = {};
for (let i = 0; i < agentIds.length; i += 100) {
  const ids = agentIds.slice(i, i + 100);
  const j = await cached(path.join(CACHE, "aic/agents", hash(ids.join(",")) + ".json"), async () => {
    const r = await fetchRetry(`${AIC_API}/agents?limit=100&fields=id,title,agent_type_title,birth_date,death_date&ids=${ids.join(",")}`, { headers: { "AIC-User-Agent": AIC_UA, "User-Agent": UA } }, { gate: limits.aic });
    return r.json();
  });
  for (const a of j.data) agents[a.id] = a;
}

console.log("Fetching The Met highlights…");
const metRaw = await fetchMet();
console.log(`  ${metRaw.length} Met records`);

// Normalise + filter
const drops = {};
const debugDrops = [];
let current;
const drop = (why) => {
  drops[why] = (drops[why] || 0) + 1;
  debugDrops.push({ why, key: current.key, title: current.rawTitle, artist: current.artistName, culture: current.culture, kind: current.kind, date: current.begin, dept: current.dept, style: current.style });
};
const candidates = [];
for (const c of [...aicRaw.map((r) => fromAIC(r, agents)), ...metRaw.map(fromMet)]) {
  current = c;
  if (!c.publicDomain) { drop("not public domain / no image"); continue; }
  if (!c.kind) { drop("photograph or excluded type"); continue; }
  if (c.skipAttrib) { drop("workshop/follower attribution"); continue; }
  if (/\bdetail\b/i.test(c.rawTitle)) { drop("detail image"); continue; }
  c.begin = Number.isFinite(c.begin) ? c.begin : null;
  c.end = Number.isFinite(c.end) ? c.end : c.begin;
  if (c.begin == null) { drop("no date"); continue; }
  c.date = Math.round((c.begin + c.end) / 2);
  if ((c.culture === "Greece" || c.culture === "Rome") && c.date >= 400 && c.date < 1460) c.culture = "Byzantium";
  c.region = regionOf(c.culture);
  c.title = displayTitle(c.rawTitle, c.culture);
  if (!c.title) { drop("no title"); continue; }
  c.curatedArtist = c.anonymous ? null : curatedArtistId(c.artistName);
  if (isCuratedDuplicate(c.rawTitle, c.curatedArtist)) { drop("already in curated 54"); continue; }
  c.movement = assignMovement(c, c.curatedArtist);
  if (!c.movement) { drop("no fitting movement"); continue; }
  c.nonWestern = NON_WESTERN.has(c.movement) || c.date < 1400;
  const cleanName = c.artistName ? clean(c.artistName.replace(/\([^)]*\)/g, "").replace(/[　-鿿]+/g, "")).replace(/[,\s]+$/, "") : null;
  c.displayArtist = cleanName;
  c.artistKey = c.curatedArtist || (c.anonymous ? `anon-${slug(c.culture)}` : slug(cleanName));
  if (!c.artistKey || c.artistKey === "anon-") { drop("no artist key"); continue; }
  // Generic vessel names make weaker pairings; nudge them down a little.
  if (/^(bowl|bottle|jar|cup|plate|dish|vase|ewer|jug|beaker|box|lamp|pitcher|goblet|tankard|basin|flask|spoon|fork|knife)$/i.test(c.title)) c.priority -= 8;
  candidates.push(c);
}
console.log(`  ${candidates.length} candidates after filtering`);
writeJSON(path.join(CACHE, "debug/drops.json"), debugDrops);
writeJSON(
  path.join(CACHE, "debug/candidates.json"),
  candidates.map((c) => ({ key: c.key, title: c.title, artist: c.artistKey, culture: c.culture, region: c.region, kind: c.kind, movement: c.movement, date: c.date, priority: c.priority, dept: c.dept })),
);

if (process.env.DRY) process.exit(0); // development: stop after filtering

// Order for selection: famous works first within each (kind group, region),
// interleaved across regions by a weighted round-robin (weight = sqrt of the
// region's pool size) so smaller traditions are not crowded out by sheer volume.
candidates.sort((a, b) => b.priority - a.priority);
{
  const rank = {};
  const size = {};
  for (const c of candidates) size[GROUP_OF[c.kind] + c.region] = (size[GROUP_OF[c.kind] + c.region] || 0) + 1;
  for (const c of candidates) {
    const k = GROUP_OF[c.kind] + c.region;
    rank[k] = (rank[k] || 0) + 1;
    c.vtime = rank[k] / Math.sqrt(size[k]);
  }
  candidates.sort((a, b) => a.vtime - b.vtime || b.priority - a.priority);
}

const dupKeys = (c) => {
  const keys = [`${c.artistKey}|${norm(c.rawTitle.replace(/\([^)]*\)/g, ""))}`];
  if (c.img.aic) keys.push(`img|${c.img.aic}`);
  if (c.img.large) keys.push(`img|${c.img.large}`);
  const ms = c.rawTitle.match(/\b(?:folio|page|leaf|bifolio)s? from (?:an? |the )?(.+)$/i);
  if (ms) keys.push(`ms|${norm(ms[1])}`);
  return keys;
};

// Selection targets: [group, nonWestern] -> count. P painting, W works on paper,
// S sculpture & 3D objects, O textiles & manuscripts.
const TOTAL = 420;
const TARGET = { "P:w": 165, "P:nw": 40, "W:w": 60, "W:nw": 25, "S:w": 15, "S:nw": 80, "O:w": 10, "O:nw": 30 };
const GROUP_TARGET = { P: 205, W: 85, S: 95, O: 40 };
const CAP = { artist: 3, culture: 55, movement: 32, cultureGroup: 30 };

const counts = { bucket: {}, group: {}, artist: {}, culture: {}, movement: {}, cultureGroup: {}, total: 0 };
const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
const usedKeys = new Set();
const bucketOf = (c) => `${GROUP_OF[c.kind]}:${c.nonWestern ? "nw" : "w"}`;
function fits(c, cnt, phase) {
  if (dupKeys(c).some((k) => usedKeys.has(k))) return false;
  if (!c.anonymous && (cnt.artist[c.artistKey] || 0) >= CAP.artist) return false;
  if ((cnt.culture[c.culture] || 0) >= CAP.culture) return false;
  if ((cnt.movement[c.movement] || 0) >= CAP.movement) return false;
  if ((cnt.cultureGroup[c.culture + GROUP_OF[c.kind]] || 0) >= CAP.cultureGroup) return false;
  if (cnt.total >= TOTAL) return false;
  if (phase === 1) return (cnt.bucket[bucketOf(c)] || 0) < TARGET[bucketOf(c)];
  return (cnt.group[GROUP_OF[c.kind]] || 0) < Math.round(GROUP_TARGET[GROUP_OF[c.kind]] * 1.15);
}
function take(c, cnt) {
  inc(cnt.bucket, bucketOf(c));
  inc(cnt.group, GROUP_OF[c.kind]);
  inc(cnt.artist, c.artistKey);
  inc(cnt.culture, c.culture);
  inc(cnt.movement, c.movement);
  inc(cnt.cultureGroup, c.culture + GROUP_OF[c.kind]);
  cnt.total++;
}
const cloneCounts = (cnt) => JSON.parse(JSON.stringify(cnt));

console.log("Selecting and verifying images…");
const chosen = [];
const imageDrops = {};
const tried = new Set();
for (const phase of [1, 2]) {
  let idx = 0;
  while (counts.total < TOTAL && idx < candidates.length) {
    const tentative = cloneCounts(counts);
    const tentativeKeys = new Set(usedKeys);
    const batch = [];
    while (batch.length < 30 && idx < candidates.length) {
      const c = candidates[idx++];
      if (tried.has(c.key)) continue;
      const keys = dupKeys(c);
      if (keys.some((k) => tentativeKeys.has(k))) continue;
      if (!fits(c, tentative, phase)) continue;
      batch.push(c);
      take(c, tentative);
      keys.forEach((k) => tentativeKeys.add(k));
    }
    if (!batch.length) break;
    const prepared = await mapPool(batch, 6, async (c) => {
      tried.add(c.key);
      try {
        return await prepareImage(c);
      } catch (e) {
        return { fail: "error: " + e.message.slice(0, 60) };
      }
    });
    batch.forEach((c, i) => {
      const p = prepared[i];
      if (p.fail) {
        imageDrops[p.fail.replace(/[\d.]+$/, "")] = (imageDrops[p.fail.replace(/[\d.]+$/, "")] || 0) + 1;
        return;
      }
      if (!fits(c, counts, phase)) return;
      Object.assign(c, p);
      chosen.push(c);
      take(c, counts);
      dupKeys(c).forEach((k) => usedKeys.add(k));
    });
    process.stdout.write(`\r  phase ${phase}: ${counts.total} selected`);
  }
  process.stdout.write("\n");
}

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

console.log("Resolving artists…");
const DEMONYM = { Egypt: "Egyptian", Greece: "Greek", Rome: "Roman", Etruria: "Etruscan", Cyprus: "Cypriot", China: "Chinese", Japan: "Japanese", Korea: "Korean", India: "Indian", Iran: "Persian", Turkey: "Turkish", Nepal: "Nepalese", Tibet: "Tibetan", Cambodia: "Khmer", Thailand: "Thai", Indonesia: "Indonesian", Mexico: "Mexican", Peru: "Peruvian", Nigeria: "Nigerian", Mali: "Malian", France: "French", Italy: "Italian", Germany: "German", Spain: "Spanish", Netherlands: "Dutch", Flanders: "Flemish", Britain: "British", "United States": "American", Byzantium: "Byzantine", Assyria: "Assyrian", Mesopotamia: "Mesopotamian", Syria: "Syrian", Iraq: "Iraqi", Levant: "Levantine", Anatolia: "Anatolian" };
const qids = chosen.map((c) => c.wikidata?.match(/Q\d+/)?.[0]).filter(Boolean);
const enwiki = await wikidataEnwiki(qids);

const newArtists = new Map();
for (const c of chosen) {
  if (c.curatedArtist) continue;
  let a = newArtists.get(c.artistKey);
  if (!a) {
    a = { id: c.artistKey, works: [], sources: [] };
    newArtists.set(c.artistKey, a);
  }
  a.works.push(c);
  a.sources.push(c);
}
// Merge named artists that differ only in how the museums spell them
// (same surname and same birth year).
{
  const byKey = new Map();
  for (const a of newArtists.values()) {
    const c = a.sources[0];
    if (c.anonymous || !c.life.born) continue;
    const k = `${norm(c.displayArtist).split(" ").pop()}|${c.life.born}`;
    const other = byKey.get(k);
    if (other && other !== a) {
      for (const w of a.works) w.artistKey = other.id;
      other.works.push(...a.works);
      other.sources.push(...a.sources);
      newArtists.delete(a.id);
    } else byKey.set(k, a);
  }
}

const artistsOut = [];
for (const a of newArtists.values()) {
  const src = a.sources.find((s) => s.origin === "met") || a.sources[0];
  const movements = [...new Set(a.works.map((w) => w.movement))];
  if (src.anonymous) {
    const dates = a.works.map((w) => w.date).sort((x, y) => x - y);
    const mid = dates[Math.floor(dates.length / 2)];
    artistsOut.push({
      id: a.id,
      name: `Unknown artist, ${src.culture}`,
      lifespan: "",
      born: Math.round(mid / 10) * 10,
      nationality: DEMONYM[src.culture] || src.culture,
      birthplace: "",
      movements,
      bio: "",
      wiki: "",
      anonymous: true,
    });
    continue;
  }
  const lifeSrc = a.sources.find((s) => s.life.born) || src;
  const l = lifeSrc.life;
  let lifespan = "";
  if (l.born) {
    const b = `${l.approxB ? "c. " : ""}${l.born}`;
    const d = l.died ? `${l.approxD ? "c. " : ""}${l.died}` : "";
    lifespan = l.active ? `active ${b}${d ? " – " + d : ""}` : d ? `${b} – ${d}` : `born ${b}`;
  }
  const qid = a.sources.map((s) => s.wikidata?.match(/Q\d+/)?.[0]).find(Boolean);
  const wikiUrl = await resolveWiki(src.displayArtist, l.active ? null : l.born, qid ? enwiki[qid] : null);
  const nat = a.sources.map((s) => s.life.nationality).find(Boolean) || DEMONYM[src.culture] || "";
  artistsOut.push({
    id: a.id,
    name: src.displayArtist,
    lifespan,
    born: l.born ? (l.active ? l.born - 25 : l.born) : Math.round(a.works[0].date / 10) * 10 - 30,
    nationality: nat,
    birthplace: a.sources.map((s) => s.life.birthplace).find(Boolean) || "",
    movements,
    bio: "",
    wiki: wikiUrl,
  });
}

// ---------------------------------------------------------------------------
// Artworks
// ---------------------------------------------------------------------------

const usedIds = new Set([...ARTWORK_ENTRIES.map((w) => w.id), ...ARTISTS.map((a) => a.id)]);
function makeId(c) {
  const base = slug(
    c.title
      .replace(/\([^)]*\)/g, "")
      .replace(/,?\s+(from|in) the series\b.*$/i, "")
      .replace(/,?\s+also known as\b.*$/i, ""),
  )
    .split("-")
    .slice(0, 7)
    .join("-") || "untitled";
  const surname = c.anonymous ? slug(c.culture) : slug((c.displayArtist || "").split(" ").pop());
  for (const id of [base, `${base}-${surname}`, `${base}-${surname}-${c.oid}`]) {
    if (id && !usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
}

const COLLECTION = { aic: "The Art Institute of Chicago", met: "The Metropolitan Museum of Art, New York" };
const artworksOut = chosen
  .sort((a, b) => a.date - b.date)
  .map((c) => {
    c.traits = deriveTraits(c);
    return {
      id: makeId(c),
      title: c.title,
      artist: c.artistKey,
      year: yearDisplay(c.dateText, c.begin, c.end),
      date: c.date,
      movement: c.movement,
      medium: cap1(clean(c.medium)).replace(/\.$/, ""),
      dimensions: dimsDisplay(c.dimensions),
      collection: COLLECTION[c.origin],
      blurb: makeBlurb(c.blurbSrc),
      lookCloser: "",
      traits: c.traits,
      image: c.image,
      kind: c.kind,
      culture: c.culture,
      origin: c.origin,
    };
  });

writeJSON(path.join(CACHE, "debug/chosen.json"), chosen.map((c, i) => ({ id: artworksOut[i].id, kind: c.kind, movement: c.movement, color: c.color, traits: c.traits, title: c.title })));

// Movements actually used, with a sanity check that their Wikipedia pages exist.
const usedMoves = new Set(artworksOut.map((w) => w.movement));
const movementsOut = NEW_MOVEMENTS.filter((m) => usedMoves.has(m.id));
for (const m of movementsOut) {
  const s = await wikiSummary(decodeURIComponent(m.wiki.split("/wiki/")[1]));
  if (s.status !== 200) console.warn(`  ! movement wiki not found: ${m.wiki}`);
}
// Artists only reference movements that exist.
for (const a of artistsOut) a.movements = a.movements.filter((m) => ALL_MOVEMENTS.has(m));
artistsOut.sort((a, b) => a.born - b.born);

fs.writeFileSync(OUT, JSON.stringify({ movements: movementsOut, artists: artistsOut, artworks: artworksOut }, null, 1) + "\n");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const tally = (arr, f) => Object.entries(arr.reduce((o, x) => ((o[f(x)] = (o[f(x)] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]);
const show = (label, rows) => console.log(`\n${label}\n` + rows.map(([k, v]) => `  ${String(v).padStart(4)}  ${k}`).join("\n"));
const N = artworksOut.length;
console.log(`\nWrote ${path.relative(ROOT, OUT)}: ${N} artworks, ${artistsOut.length} new artists (${artistsOut.filter((a) => a.anonymous).length} anonymous), ${movementsOut.length} new movements`);
show("By kind", tally(artworksOut, (w) => w.kind));
show("By origin", tally(artworksOut, (w) => w.origin));
show("By region", tally(artworksOut, (w) => regionOf(w.culture)));
show("By culture", tally(artworksOut, (w) => w.culture));
show("By movement", tally(artworksOut, (w) => w.movement + (ALL_MOVEMENTS.get(w.movement) && NEW_MOVEMENTS.some((m) => m.id === w.movement) ? " (new)" : "")));
const nw = chosen.filter((c) => c.nonWestern).length;
console.log(`\nNon-Western or pre-1400: ${nw}/${N} (${Math.round((nw / N) * 100)}%)`);
console.log(`With blurb: ${artworksOut.filter((w) => w.blurb).length}; new artists with wiki: ${artistsOut.filter((a) => a.wiki).length}/${artistsOut.filter((a) => !a.anonymous).length}`);
show("Trait usage", tally(artworksOut.flatMap((w) => w.traits), (t) => t));
console.log(`Traits per work: min ${Math.min(...artworksOut.map((w) => w.traits.length))}, max ${Math.max(...artworksOut.map((w) => w.traits.length))}, mean ${(artworksOut.reduce((s, w) => s + w.traits.length, 0) / N).toFixed(1)}`);
show("Dropped before selection", Object.entries(drops).sort((a, b) => b[1] - a[1]));
show("Dropped at image check", Object.entries(imageDrops).sort((a, b) => b[1] - a[1]));
if (iiif403 >= IIIF_BREAKER)
  console.log("\n!! The AIC IIIF server (www.artic.edu/iiif) answered with 403 bot challenges, so AIC works were skipped.\n   Wait for the block to clear and rerun; cached Met data makes reruns fast.");
