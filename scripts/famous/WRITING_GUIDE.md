# Writing guide for Pendant's collection notes

Pendant is an "AI museum of taste" for art lovers and art historians. Visitors see two famous works side by side and pick one. Under each work sits a short wall label. You are writing those labels.

## Research first, then write
For every work you are assigned, first read its research file:
`scripts/.cache/famous/research/works/<id>.json`

It has two parts:
- `meta`: structured facts from Wikidata (creators, inception, materials, height/width, collection, location, movement, genre, what it depicts, description).
- `article`: the English Wikipedia article text, up to 9,000 characters.

Base every fact on this research. If the article is thin or contradicts Wikidata on something you want to state, do a quick check with WebSearch/WebFetch (museum site or Wikipedia). If you are still not sure, leave that fact out. Never invent dates, dimensions, provenance or anecdotes. When scholars disagree (attribution, date, sitter), say so briefly.

## Voice
Write the way a sharp, warm museum curator writes a wall label for a knowledgeable audience:
- plain, precise, confident
- concrete: name techniques, patrons, places, and what is actually in the picture
- no hype ("masterpiece", "iconic", "stunning", "breathtaking"), no filler, no rhetorical questions
- **never use em dashes (—)**; use commas, colons or full stops (en dashes only in number ranges, like 1503–06)
- British or American spelling is fine, but be consistent within a note (the existing notes use British "colour")

Two existing labels to match in tone and length:

> **The Calling of Saint Matthew.** Christ enters a dim counting-house and points at the tax collector Matthew, who is counting coins with a group of fashionably dressed men. A shaft of light follows Christ's gesture across the wall. The sacred breaks into an ordinary Roman room.
> *Look closer:* Christ's hand quotes Adam's hand from Michelangelo's Sistine ceiling. Scholars still debate which man at the table is Matthew.

> **The Arnolfini Portrait.** An Italian merchant and his wife stand in a Bruges interior filled with signs of wealth: oranges, a brass chandelier, a fur-lined gown, a tiny terrier. Whether it records a betrothal, a marriage or simply a status portrait is still argued over.
> *Look closer:* The convex mirror reflects two more figures in the doorway, and above it the painter wrote "Jan van Eyck was here 1434."

## Output
Write a JSON array to the output file you were given. One object per work, in this exact shape:

```json
{
  "id": "mona-lisa",
  "title": "Mona Lisa",
  "artist": "leonardo",
  "year": "c. 1503–19",
  "date": 1503,
  "movement": "italian-renaissance",
  "medium": "Oil on poplar panel",
  "dimensions": "77 × 53 cm",
  "collection": "Musée du Louvre, Paris",
  "culture": "Italy",
  "kind": "painting",
  "blurb": "…",
  "lookCloser": "…",
  "traits": ["portrait", "serene", "..."]
}
```

Field rules:
- **id**: exactly the id you were given (the research file name). Do not change it.
- **title**: the common English title a museum would use. Clean up Wikidata oddities (e.g. "Pietà (Michelangelo)" → "Pietà", "las cabezas colosales…" → "Olmec Colossal Head"). For groups or series (Terracotta Army, Benin Bronzes, Olmec heads, Riace bronzes), title it for the group and let the blurb say what the image shows.
- **artist**: one of
  - an existing artist id from `vocab.json` → `artists` (e.g. `"rembrandt"`, `"jan-van-eyck"`). Match on the real person, not a shared surname: Hubert van Eyck is not Jan van Eyck, and Jan Vermeer van Haarlem is neither Vermeer nor Bruegel. For the Ghent Altarpiece use `"jan-van-eyck"` and mention Hubert in the blurb.
  - `"Q<number>"`: the Wikidata QID of the real maker, for a named artist not in the list. Take it from `meta.creators` when it's right. If `meta.creators` names a foundry, workshop or copyist (e.g. "Fonderie Hébrard" for Rodin's The Thinker), use the real artist instead, written as `"name:Auguste Rodin"`.
  - `"anon"` for unknown or culture-attributed makers (most ancient, prehistoric and many non-Western works). Set `culture` carefully, because anonymous works are grouped into an "Unknown artist, <culture>" record.
- **year**: display string, e.g. `"1665"`, `"c. 1503–19"`, `"c. 1345 BCE"`, `"1st century BCE"`. **date**: one number for sorting (negative for BCE).
- **movement**: exactly one id from `vocab.json` → `movements`. Pick the best fit by style, place and date. Northern Song Chinese works go in `song-landscape`; other Chinese works in `chinese-art`; Early Netherlandish in `northern-renaissance`; Giotto/Duccio-era Italian works in `medieval-europe`; Greek and Roman (including Mycenaean) in `classical-antiquity`; Mesopotamian, Assyrian and Babylonian in `ancient-near-east`; Palaeolithic and Bronze Age European in `prehistoric-art`; Repin, Kramskoi and the Peredvizhniki in `russian-realism`.
- **medium**, **dimensions** (`""` if unknown, otherwise like `"77 × 53 cm"`, height first; for sculpture `"H. 207 cm"`), **collection** (`"Museum name, City"`; for in-situ works the building and city, e.g. `"Sistine Chapel, Vatican City"`).
- **culture**: country or culture of origin, e.g. `"Italy"`, `"Ancient Egypt"`, `"Mesopotamia"`, `"China"`, `"Mexica (Aztec)"`.
- **kind**: one of `painting`, `print`, `drawing`, `sculpture`, `object`, `textile`, `manuscript` (frescoes and mosaics count as `painting`).
- **blurb**: 2–3 sentences, 45–70 words. What it is, what we see, why it matters. Must stand on its own.
- **lookCloser**: one or two sentences, max 35 words: a specific, verifiable detail worth finding in the image.
- **traits**: 4–8 ids from `vocab.json` → `traits`. Include at least one subject trait, a light or colour trait where clear, and a form trait (`naturalistic` or `stylized`). Only use ids from the list.

Validate before you finish: the file must parse as JSON, contain every assigned id exactly once, use only allowed movement and trait ids, and contain no em dash character. Check with node, e.g. `node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'))"`.

---

# Artist biographies

Research file: `scripts/.cache/famous/research/artists/<QID>.json` with `meta` (Wikidata: birth/death dates, birthplace, citizenship, movements, description, English Wikipedia title) and `article` (English Wikipedia text, up to 5,000 characters). Read it before writing. Same voice rules as above (no em dashes, no hype, only facts you can support).

Match this existing bio in tone and length:

> **Caravaggio.** Michelangelo Merisi da Caravaggio painted saints as street people, lit by a single hard beam against black shadow. His naturalism scandalised some patrons and thrilled others. His life was as violent as his pictures: after killing a man in 1606 he fled Rome and spent his last years moving between Naples, Malta and Sicily. His influence spread across all of Europe.

Output: a JSON array, one object per artist:

```json
{
  "qid": "Q5592",
  "id": "michelangelo",
  "name": "Michelangelo",
  "lifespan": "1475 – 1564",
  "born": 1475,
  "nationality": "Italian",
  "birthplace": "Caprese, Tuscany",
  "bio": "…",
  "wiki": "https://en.wikipedia.org/wiki/Michelangelo"
}
```

- **id**: kebab-case of the name as commonly known, without accents (`"el-greco"`, `"gian-lorenzo-bernini"`, `"jacques-louis-david"`).
- **name**: the name a museum label uses (`"El Greco"`, `"Gian Lorenzo Bernini"`, `"Pieter Paul Rubens"` → use `"Peter Paul Rubens"`).
- **lifespan**: `"1475 – 1564"` with spaces around an en dash; `"c. 1390 – 1441"` when approximate; `"active c. 1440 – 1470"` if only activity is known.
- **born**: a number (best estimate).
- **nationality**: adjective as used for the period (`"Flemish"`, `"Spanish"`, `"Russian"`, `"Greek"` for ancient Greek sculptors).
- **birthplace**: `""` if unknown.
- **bio**: 3–4 sentences, 60–90 words: training or origins, what distinguishes the work, their place in art history, and one telling fact.
- **wiki**: the English Wikipedia URL from the research (`https://en.wikipedia.org/wiki/<Title_with_underscores>`), or `""`.
