# Roadmap

## Now: museum redesign
- [x] Artworks fill almost the whole screen on the main view
- [x] Captions sit beside or under the work, never over it
- [x] Hide/show captions (button + `I` key), remembered between visits
- [x] "AI art museum" look: dark gallery walls, ambient glow taken from each artwork, film grain, iridescent accent for AI elements
- [x] Carry the new look through the artwork, artist, epoch and taste pages

## Next: the six additions
1. **LLM curator**
   - [x] Taste summary written by an LLM (falls back to the templated one without a key)
   - [x] "Why this matches you" for each recommendation
   - [x] "Ask the curator" about any work, clearly labelled as AI-written
2. **Bigger collection**
   - [x] The world's most famous works: 374, ranked by Wikipedia coverage, from every major collection via Wikimedia Commons
   - [x] New epochs and artist pages for the imported works
   - [x] Every label and bio researched (Wikipedia + Wikidata, museum sites where needed) before being written
3. **Visual similarity**
   - [x] CLIP image embeddings for every work, computed once at build time
   - [x] "Looks like this" on each artwork page
   - [x] Taste model also learns in visual space, not only from tags
4. **"Both" and "neither"**
   - [x] Two extra answers in the duel that teach the model something different from a single pick
5. **Your collection and sharing**
   - [x] Save works to a personal collection
   - [x] Shareable taste profile link
   - [x] "See it in person": where each work hangs, with a map link
   - [ ] Accounts and sync across devices (needs a hosting + auth decision, see below)
6. **Beyond Western oil painting**
   - [x] Prints, drawings, sculpture and objects
   - [x] Art from Asia, the Islamic world, Africa, the ancient Americas and antiquity
   - [x] A "medium" dimension in the taste model

## Cost controls
- [x] Notes about works and artists written in advance, not per visitor
- [x] Curator: shared cache, per-visitor rate limit, low effort

## Open decisions
- **Curator key.** Put `ANTHROPIC_API_KEY=...` in `.env.local` to switch the AI curator on.
- Accounts need a hosted deployment and an auth + database provider. Everything is built so local state can sync later.
