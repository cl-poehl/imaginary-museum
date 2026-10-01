// Taste archetypes: written in advance, matched to a visitor's learned
// preferences. Each signature uses the taste model's own feature ids
// ("t:" trait, "m:" epoch, "k:" medium), so matching is a plain cosine
// between the visitor's weights and the signature. Only artists that are in
// the collection are named.

export type Archetype = {
  id: string;
  name: string;
  epithet: string;
  prose: string;
  /** Completes "There is also a streak of <name> in you: …" */
  streak: string;
  signature: Record<string, number>;
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "tenebrist",
    name: "The Tenebrist",
    epithet: "Drama, darkness and a single beam of light",
    prose:
      "You are drawn to pictures that happen in the dark. Caravaggio's saints lit like street people, Rembrandt's faces surfacing from brown shadow, Ribera's weathered bodies: you want a moment of crisis, caught by a hard shaft of light. Calm, evenly lit scenes lose you. What holds you is the edge where a figure meets the night around it.",
    streak: "a pull toward candlelit drama and faces emerging from shadow",
    signature: { "t:shadow": 1, "t:dramatic": 1, "m:baroque": 0.9, "m:dutch-golden-age": 0.4, "t:naturalistic": 0.4, "t:warm": 0.3, "t:luminous": -0.6, "t:joyful": -0.3 },
  },
  {
    id: "luminist",
    name: "The Luminist",
    epithet: "Light, air and the passing hour",
    prose:
      "What you look for is light itself. Monet's harbour dissolving into morning haze, Renoir's dappled afternoons, Turner's skies burning over the water: you respond to paintings where atmosphere is the real subject and edges soften into colour. You would rather feel the temperature of a day than read a story, and a quick, broken brushstroke speaks to you more than a polished surface.",
    streak: "a love of open light and air on the move",
    signature: { "t:luminous": 1, "t:painterly": 0.9, "m:impressionism": 1, "t:landscape": 0.5, "t:water": 0.5, "t:serene": 0.4, "t:shadow": -0.6, "t:precise": -0.3 },
  },
  {
    id: "colourist",
    name: "The Colourist",
    epithet: "Colour as feeling",
    prose:
      "For you, colour does the talking. Van Gogh's cypresses and stars, Gauguin's flat reds and yellows, Titian's glowing flesh: you want pigment that carries emotion before you have worked out the subject. Muted, tonal pictures can leave you cold. You are happiest where a painter trusts saturated colour and visible brushwork to do what drawing alone cannot.",
    streak: "an appetite for saturated, singing colour",
    signature: { "t:vivid": 1, "t:painterly": 0.6, "m:post-impressionism": 1, "t:warm": 0.4, "t:stylized": 0.4, "m:expressionism": 0.3, "t:muted": -0.7 },
  },
  {
    id: "classicist",
    name: "The Classicist",
    epithet: "Balance, proportion and the ideal body",
    prose:
      "You trust order. The poised marble athletes of Greece, Raphael's harmonious groups, the calm geometry of a Renaissance room: you are drawn to art that seeks an ideal and holds its feelings in check. Clarity of form matters to you more than the painter's handwriting. You admire works that look inevitable, as if nothing could be moved without the whole falling out of balance.",
    streak: "a respect for poise, proportion and the classical ideal",
    signature: { "m:classical-antiquity": 1, "m:italian-renaissance": 0.8, "m:neoclassicism": 0.6, "t:naturalistic": 0.7, "t:serene": 0.6, "t:nude": 0.3, "t:uncanny": -0.5, "t:painterly": -0.3 },
  },
  {
    id: "romantic",
    name: "The Romantic",
    epithet: "The sublime and the storm",
    prose:
      "You want to feel small before something vast. Friedrich's lone figures facing fog and ice, Géricault's raft in the swell, Delacroix's barricades and Aivazovsky's towering sea: you are moved by nature and history at their most overwhelming. Feeling outranks reason for you, and you like a painting that leaves you slightly unsettled, as if the weather might turn.",
    streak: "a taste for the sublime, for storms and solitary figures",
    signature: { "m:romanticism": 1, "t:dramatic": 0.7, "t:melancholy": 0.5, "t:landscape": 0.5, "t:water": 0.4, "t:history": 0.4, "t:spiritual": 0.3, "t:joyful": -0.4 },
  },
  {
    id: "realist",
    name: "The Realist",
    epithet: "Ordinary lives, seen straight",
    prose:
      "You believe the everyday deserves to be painted seriously. Millet's gleaners, Courbet's stone breakers, Repin's barge haulers straining on the Volga: you are drawn to work that looks hard at labour, poverty and ordinary people without prettifying them. Idealised gods and allegories can feel evasive to you. You value honesty over charm, and weight over sparkle.",
    streak: "an eye for honest, unidealised everyday life",
    signature: { "m:realism": 1, "m:russian-realism": 0.8, "t:everyday": 0.9, "t:naturalistic": 0.6, "t:muted": 0.5, "t:myth": -0.5, "t:gold": -0.3 },
  },
  {
    id: "quiet-interior",
    name: "The Quiet Interior",
    epithet: "Stillness, daylight and absorption",
    prose:
      "You love a room where nothing much happens. Vermeer's women reading letters by the window, a milkmaid pouring, a woman weighing pearls at a balance: you are drawn to scenes of concentration, held in soft daylight. Loud gestures and crowded canvases tire you. What moves you is attention itself, and the way light settles on a wall, a sleeve or a jug.",
    streak: "a fondness for quiet rooms and absorbed, solitary figures",
    signature: { "t:intimate": 1, "t:serene": 0.8, "m:dutch-golden-age": 0.9, "t:everyday": 0.6, "t:solitary": 0.6, "t:precise": 0.5, "t:luminous": 0.3, "t:crowded": -0.6, "t:dramatic": -0.5 },
  },
  {
    id: "dreamer",
    name: "The Dreamer",
    epithet: "Myth, mood and the half-seen",
    prose:
      "You prefer pictures that suggest rather than explain. Böcklin's island of cypresses, Waterhouse's doomed heroines, Millais's Ophelia among the flowers: you are drawn to legend, reverie and a slightly heavy air, where every object might be a symbol. Plain description is not enough for you. You want a painting to keep something back.",
    streak: "a weakness for reverie, legend and quiet symbolism",
    signature: { "m:symbolism": 1, "m:pre-raphaelites": 0.9, "t:symbolic": 0.8, "t:melancholy": 0.7, "t:myth": 0.6, "t:uncanny": 0.4, "t:everyday": -0.4 },
  },
  {
    id: "abstractionist",
    name: "The Abstractionist",
    epithet: "Form and colour, freed from things",
    prose:
      "You do not need a picture to be of anything. Malevich's black square, Mondrian's balanced grid, Kandinsky's storm of line, Hilma af Klint's floating spirals: you respond to colour, shape and rhythm as a language of their own. Anecdote and illusion can feel like clutter to you. What interests you is structure, and the charge a pure form can carry.",
    streak: "a feeling for pure form, flat colour and structure",
    signature: { "t:nonfigurative": 1, "m:early-abstraction": 1, "t:flat": 0.7, "t:stylized": 0.5, "t:vivid": 0.3, "t:naturalistic": -0.7, "t:portrait": -0.3 },
  },
  {
    id: "archaeologist",
    name: "The Archaeologist",
    epithet: "The deep past, in stone, gold and clay",
    prose:
      "You are drawn to art made before there were artists' names. The Narmer Palette, the Standard of Ur, the Venus of Willendorf, the gold mask of Tutankhamun: you respond to objects that carry the weight of a whole civilisation, made for gods, kings and the dead rather than for galleries. Stylised forms and ancient conventions fascinate rather than distance you.",
    streak: "a fascination with the ancient world and its objects",
    signature: { "m:ancient-egypt": 1, "m:ancient-near-east": 1, "m:prehistoric-art": 0.9, "t:stylized": 0.7, "k:object": 0.6, "k:sculpture": 0.5, "t:symbolic": 0.3, "t:painterly": -0.4 },
  },
  {
    id: "devotional",
    name: "The Devotional Eye",
    epithet: "Gold grounds, saints and the sacred",
    prose:
      "You are moved by art made for prayer. Duccio's gold-ground Madonnas, the Virgin of Vladimir, the altarpieces of van Eyck and Grünewald: you respond to images meant to open onto something beyond this world. Gold, stillness and hierarchy do not feel stiff to you but charged. You look at these works the way they were meant to be seen, slowly.",
    streak: "a sensitivity to the sacred and to gold-ground stillness",
    signature: { "t:sacred": 1, "t:spiritual": 0.9, "t:gold": 0.7, "m:medieval-europe": 1, "m:northern-renaissance": 0.5, "t:stylized": 0.3, "t:everyday": -0.4, "t:nude": -0.3 },
  },
  {
    id: "northern-eye",
    name: "The Northern Eye",
    epithet: "Every thread, every reflection",
    prose:
      "You love to look closely. Van Eyck's convex mirror, Holbein's ambassadors and their instruments, Memling's jewel-like panels: you are drawn to the Northern Renaissance habit of rendering every fur trim, brass chandelier and distant town, and loading ordinary objects with meaning. Loose brushwork can feel unfinished to you. You enjoy a picture you can search for an hour.",
    streak: "a delight in minute detail and hidden meaning",
    signature: { "m:northern-renaissance": 1, "t:precise": 1, "t:symbolic": 0.8, "t:naturalistic": 0.5, "t:portrait": 0.3, "t:painterly": -0.6 },
  },
  {
    id: "sensualist",
    name: "The Sensualist",
    epithet: "Flesh, silk and warm colour",
    prose:
      "You respond to beauty that is frankly physical. Titian's reclining Venuses, Correggio's Io in the embrace of a cloud, Fragonard's swing, Klimt's lovers wrapped in gold: you are drawn to skin, fabric and warm light, and to painters who make touch almost visible. Austerity is not your language. You like a painting that seduces before it instructs.",
    streak: "a frank pleasure in flesh, silk and warmth",
    signature: { "t:sensual": 1, "t:nude": 0.8, "t:warm": 0.6, "m:rococo": 0.5, "m:italian-renaissance": 0.4, "m:academic-art": 0.4, "t:sacred": -0.4, "t:muted": -0.3 },
  },
  {
    id: "history-reader",
    name: "The History Reader",
    epithet: "Great events, painted large",
    prose:
      "You like a picture with a story and consequences. David's oaths and deaths, Goya's firing squad, Matejko's battles, Leutze crossing the Delaware: you are drawn to the moment history turns, staged on a big canvas with a cast of figures. You read these paintings like novels, and you are interested in how they shaped the way nations remember themselves.",
    streak: "an interest in great events and crowded, heroic canvases",
    signature: { "t:history": 1, "t:crowded": 0.7, "t:dramatic": 0.6, "m:neoclassicism": 0.6, "m:romanticism": 0.5, "m:academic-art": 0.4, "t:intimate": -0.5, "t:still-life": -0.4 },
  },
  {
    id: "portraitist",
    name: "The Portrait Seeker",
    epithet: "A face that looks back",
    prose:
      "What you look for is a person. The Mona Lisa's unreadable smile, Vermeer's girl turning over her shoulder, Velázquez's Innocent X, Dürer facing us like an icon: you are drawn to faces that feel alive, and to the silent exchange between sitter, painter and viewer. Landscapes rarely hold you for long. You want to meet somebody.",
    streak: "a hunger for faces and the people behind them",
    signature: { "t:portrait": 1, "t:solitary": 0.7, "t:intimate": 0.6, "t:naturalistic": 0.5, "t:landscape": -0.5, "t:crowded": -0.4 },
  },
  {
    id: "wanderer",
    name: "The Landscape Wanderer",
    epithet: "Distance, weather and the long view",
    prose:
      "You want to walk into the picture. Bruegel's hunters above the frozen valley, Constable's hay wain, Cézanne's mountain, Guo Xi's misty peaks: you are drawn to land and sky, to paths that lead the eye into the distance and to the changing weather over them. Figures matter less to you than the space they move through.",
    streak: "a longing for open land, sky and distance",
    signature: { "t:landscape": 1, "t:serene": 0.5, "t:water": 0.4, "m:song-landscape": 0.5, "m:romanticism": 0.4, "m:impressionism": 0.3, "t:portrait": -0.6, "t:crowded": -0.2 },
  },
  {
    id: "ink-and-silence",
    name: "Ink and Silence",
    epithet: "Brush, void and the far horizon",
    prose:
      "You are drawn to the art of East Asia, where empty space is as eloquent as the brush. Fan Kuan's cliff rising over tiny travellers, Huang Gongwang's long river journey, Hokusai's wave and Sōtatsu's gods of wind and thunder: you respond to rhythm, restraint and a way of seeing that does not depend on a single fixed viewpoint.",
    streak: "an affinity for ink, emptiness and the art of East Asia",
    signature: { "m:song-landscape": 1, "m:chinese-art": 1, "m:japanese-art": 0.8, "m:ukiyo-e": 0.8, "t:stylized": 0.5, "t:serene": 0.4, "t:landscape": 0.4, "t:muted": 0.3 },
  },
  {
    id: "mythologist",
    name: "The Mythologist",
    epithet: "Gods, heroes and old stories",
    prose:
      "You love the old stories. Botticelli's Venus arriving on her shell, Titian's Diana and Actaeon, Bernini's Daphne turning into laurel, Waterhouse's nymphs: you are drawn to gods, metamorphoses and heroes, and to the way each age retold the same myths in its own style. You enjoy knowing the tale, and seeing which moment the artist chose.",
    streak: "a love of myth and metamorphosis",
    signature: { "t:myth": 1, "t:sensual": 0.4, "t:nude": 0.4, "m:italian-renaissance": 0.5, "m:baroque": 0.3, "m:pre-raphaelites": 0.4, "t:everyday": -0.5 },
  },
  {
    id: "ornamentalist",
    name: "The Ornamentalist",
    epithet: "Pattern, gold and the decorative surface",
    prose:
      "You love surfaces that shimmer. Klimt's gold leaf and patterned robes, the Ardabil Carpet's endless design, illuminated gospel pages, Byzantine icons: you are drawn to ornament, rhythm and flat, jewelled pattern rather than illusionistic depth. To you, decoration is not a lesser art. It is where craft, symbol and beauty meet.",
    streak: "a delight in pattern, gold and ornament",
    signature: { "t:gold": 1, "t:flat": 0.8, "t:stylized": 0.7, "m:vienna-secession": 0.9, "m:islamic-art": 0.8, "k:manuscript": 0.6, "k:textile": 0.6, "t:naturalistic": -0.5 },
  },
  {
    id: "sculptors-eye",
    name: "The Sculptor's Eye",
    epithet: "Form you could walk around",
    prose:
      "You respond to things in three dimensions. Michelangelo's David, the Winged Victory on her prow, the writhing Laocoön, Bernini's marble turned to flesh: you are drawn to the weight, torsion and presence of bodies in stone and bronze. A painting can feel like a window to you, but a sculpture is a presence in the room.",
    streak: "a feeling for sculpture and the weight of bodies in space",
    signature: { "k:sculpture": 1, "m:classical-antiquity": 0.6, "t:naturalistic": 0.5, "t:nude": 0.4, "k:painting": -0.5 },
  },
  {
    id: "pleasure-seeker",
    name: "The Pleasure Seeker",
    epithet: "Parties, parks and leisure",
    prose:
      "You like art that enjoys life. Renoir's dances and boating lunches, Watteau's lovers drifting toward Cythera, Fragonard's swing, Seurat's Sunday on the island: you are drawn to leisure, company and sunlight, to painters who celebrate an afternoon well spent. Gloom and martyrdom are not for you. You want to be invited in.",
    streak: "a taste for leisure, company and sunlit afternoons",
    signature: { "t:joyful": 1, "t:everyday": 0.6, "t:luminous": 0.5, "m:rococo": 0.7, "m:impressionism": 0.6, "t:crowded": 0.3, "t:melancholy": -0.6, "t:dramatic": -0.4 },
  },
  {
    id: "melancholic",
    name: "The Melancholic",
    epithet: "Solitude, twilight and loss",
    prose:
      "You are drawn to sadness done well. Friedrich's monk by the sea, Degas's absinthe drinker, Munch's scream, Manet's barmaid staring past us: you respond to solitude, twilight and the moment after something has ended. Cheerful pictures can seem thin to you. You find a quiet companionship in art that admits how lonely looking can be.",
    streak: "an ear for melancholy and solitary figures",
    signature: { "t:melancholy": 1, "t:solitary": 0.6, "t:cool": 0.5, "t:muted": 0.5, "t:joyful": -0.8, "t:crowded": -0.3 },
  },
  {
    id: "visionary",
    name: "The Visionary",
    epithet: "Monsters, nightmares and strange worlds",
    prose:
      "You like art that goes strange. Bosch's gardens of hybrids, Bruegel's Mad Meg striding toward hell, Fuseli's nightmare crouched on a sleeper, Goya's Saturn devouring his son: you are drawn to the fantastic and the disturbing, and to artists who picture what cannot be seen. Polite beauty is not enough. You want to be surprised, even unsettled.",
    streak: "a fascination with the fantastic and the uncanny",
    signature: { "t:uncanny": 1, "t:symbolic": 0.5, "t:crowded": 0.5, "t:dramatic": 0.4, "m:northern-renaissance": 0.4, "m:symbolism": 0.4, "t:serene": -0.6 },
  },
  {
    id: "expressionist",
    name: "The Expressionist",
    epithet: "Nerves, distortion and inner weather",
    prose:
      "You want to see how a picture feels from the inside. Munch's scream, Schiele's twisted self-portrait, Van Gogh's wheatfield under crows, Franz Marc's blue horses: you are drawn to distortion, raw colour and a painter's nerves showing through. Correct proportion matters little to you if the emotion is true. You like art that is urgent rather than polished.",
    streak: "a responsiveness to raw emotion and expressive distortion",
    signature: { "m:expressionism": 1, "m:symbolism": 0.5, "m:post-impressionism": 0.4, "t:uncanny": 0.5, "t:stylized": 0.6, "t:vivid": 0.4, "t:precise": -0.5, "t:serene": -0.4 },
  },
  {
    id: "still-life",
    name: "The Still-Life Lover",
    epithet: "Things, closely considered",
    prose:
      "You find whole worlds in a table top. Heda's overturned silver cup and half-peeled lemon, Van Gogh's sunflowers, a skull, a glass of wine catching the window: you are drawn to objects looked at with complete attention, and to the quiet reminders of time and mortality they often carry. You enjoy paintings that reward slow looking at small things.",
    streak: "a pleasure in objects closely observed",
    signature: { "t:still-life": 1, "t:precise": 0.6, "t:symbolic": 0.5, "t:serene": 0.4, "m:dutch-golden-age": 0.5, "t:crowded": -0.5, "t:history": -0.4 },
  },
  {
    id: "salon",
    name: "The Salon Connoisseur",
    epithet: "Polish, virtuosity and the grand manner",
    prose:
      "You admire sheer skill. Bouguereau's porcelain skin, Ingres's odalisques, Cabanel's Venus on the foam, Alma-Tadema's rain of roses: you are drawn to the polished finish and ambitious subjects of the nineteenth-century academies and Salons. Once dismissed by modernists, this art rewards you with technique that seems effortless, and with beauty that makes no apology for itself.",
    streak: "an admiration for academic polish and virtuosity",
    signature: { "m:academic-art": 1, "m:neoclassicism": 0.5, "m:aestheticism": 0.6, "t:precise": 0.8, "t:naturalistic": 0.5, "t:sensual": 0.5, "t:myth": 0.4, "t:painterly": -0.5 },
  },
  {
    id: "mannerist",
    name: "The Mannerist",
    epithet: "Elegance, strain and elongated grace",
    prose:
      "You like art that bends the rules. Parmigianino's long-necked Madonna, Bronzino's cool, enamelled allegory, El Greco's flame-like saints: you are drawn to elongated figures, strange colour and a refined, slightly uneasy elegance. Perfect balance can bore you. You enjoy the moment when artists who had mastered the Renaissance started to push against it.",
    streak: "a taste for elongated elegance and refined strangeness",
    signature: { "m:mannerism": 1, "t:stylized": 0.7, "t:cool": 0.5, "t:sensual": 0.4, "t:uncanny": 0.3, "t:serene": -0.3 },
  },
  {
    id: "chronicler",
    name: "The Chronicler",
    epithet: "Crowds, proverbs and the human comedy",
    prose:
      "You love a picture full of people. Bruegel's peasant wedding and children's games, Zhang Zeduan's river city, Renoir's dancing crowd, the Bayeux Tapestry's march to Hastings: you are drawn to scenes you can read corner to corner, full of incident, humour and everyday life. One perfect figure is not enough for you. You want the whole town.",
    streak: "a love of crowded, story-filled scenes",
    signature: { "t:crowded": 1, "t:everyday": 0.8, "t:history": 0.3, "m:northern-renaissance": 0.4, "t:solitary": -0.7, "t:portrait": -0.4 },
  },
  {
    id: "sea-watcher",
    name: "The Sea Watcher",
    epithet: "Water in all its moods",
    prose:
      "Water is your subject. Hokusai's great wave, Turner's Temeraire on the Thames, Aivazovsky's ninth wave, Monet's lily pond and harbour at dawn: you are drawn to the sea, rivers and reflections, calm or raging, and to painters who make water move. For you, a horizon line over open water is one of the great subjects in art.",
    streak: "a pull toward water, waves and reflections",
    signature: { "t:water": 1, "t:landscape": 0.5, "t:dramatic": 0.3, "t:cool": 0.4, "m:ukiyo-e": 0.4, "m:romanticism": 0.4, "t:portrait": -0.5 },
  },
  {
    id: "renaissance-mind",
    name: "The Renaissance Mind",
    epithet: "Invention, perspective and humanist ideals",
    prose:
      "You are at home in the Italian Renaissance. Leonardo's smile and sfumato, Raphael's School of Athens, Piero's measured Flagellation, Michelangelo's Adam reaching for God: you are drawn to the century when painters became thinkers, and when perspective, anatomy and ancient learning were reinvented in paint and stone. You admire intelligence as much as beauty.",
    streak: "an admiration for Renaissance invention and humanist ideals",
    signature: { "m:italian-renaissance": 1, "t:naturalistic": 0.6, "t:serene": 0.5, "t:sacred": 0.3, "t:portrait": 0.3, "t:painterly": -0.2, "t:flat": -0.4 },
  },
];

/** When the signal is weak or evenly spread. */
export const ECLECTIC: Archetype = {
  id: "eclectic",
  name: "The Eclectic",
  epithet: "Curious about everything",
  prose:
    "Your picks do not settle into one school yet, and that is a good sign: the best museum visitors look widely before they look closely. Keep choosing, and your particular way of seeing will start to show.",
  streak: "a curiosity that ranges across periods",
  signature: {},
};
