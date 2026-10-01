# Pendant

An AI museum of taste. Two works at a time; pick the one you prefer, and your curator learns what you're drawn to.

- `/` the duel: ← → choose, ↑ both, ↓ neither, space skip, U undo, I hide labels
- `/works/[id]`, `/artists/[id]`, `/epochs/[id]` detail pages; `/epochs` timeline; `/artists` index
- `/taste` your profile, the curator's read, predicted matches; `/collection` saved works and where to see them; `/shared?p=…` a shareable profile

## How it works

- **Collection** (`src/data`): 374 of the world's most famous public-domain artworks across 35 epochs, from Ice Age figurines to early abstraction. "Famous" is measured by how many Wikipedia language editions have an article about the work. The original 54 are hand-written (`artworks.ts`); the other 320 are in `famous.json`, each researched from its Wikipedia article and Wikidata before its label was written. Images come from Wikimedia Commons (public domain only; artists who died after 1955 are excluded).
- **Taste model** (`src/lib/taste.ts`): Bradley–Terry over sparse features (traits, epoch, artist, century, medium) plus 16 PCA components of each work's CLIP image embedding. "Both", "neither" and saved works add absolute signals.
- **Visual similarity** (`src/lib/similar.ts`): cosine over 512-d CLIP embeddings, server-only.
- **AI curator** (`src/app/api/curator`): Claude via the AI SDK, streaming. Needs `ANTHROPIC_API_KEY` in `.env.local`; without it the app falls back to templated text. Notes about works and artists are cached once per server; personal requests are rate-limited (20 per visitor per 10 minutes) and run at low effort.
- **State** (`src/lib/store.ts`): localStorage via `useSyncExternalStore`. Shared profiles are encoded in the URL.

## Data pipeline (`scripts/famous`)

1. `01-rank.mjs` ranks artworks on Wikidata by number of Wikipedia languages.
2. `02-select.mjs` picks the collection: public domain only, no monuments or photographs, max 8 works per artist, plus hand-picked world masterpieces.
3. `03-research.mjs` saves each work's Wikipedia article, Wikidata facts and a verified image to `scripts/.cache/famous/research`.
4. Labels and bios are written from that research following `WRITING_GUIDE.md`.
5. `04-assemble.mjs` validates everything and writes `src/data/famous.json`.
6. `node scripts/embed-images.mjs` computes CLIP embeddings for every work.

`scripts/resolve-images.mjs` resolves images for the original 54. `scripts/archive/` holds the earlier Met/AIC importer.

## Develop

```bash
npm run dev
```
