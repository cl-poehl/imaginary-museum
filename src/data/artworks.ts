export type ArtworkEntry = {
  id: string;
  title: string;
  artist: string;
  year: string;
  date: number;
  movement: string;
  medium: string;
  dimensions: string;
  collection: string;
  blurb: string;
  lookCloser: string;
  traits: string[];
};

export const ARTWORK_ENTRIES: ArtworkEntry[] = [
  // Northern Song
  {
    id: "early-spring",
    title: "Early Spring",
    artist: "guo-xi",
    year: "1072",
    date: 1072,
    movement: "song-landscape",
    medium: "Hanging scroll, ink and light colour on silk",
    dimensions: "158.3 × 108.1 cm",
    collection: "National Palace Museum, Taipei",
    blurb:
      "A mountain rises like a living thing out of spring mist, its forms twisting upward in a single surge of energy. Tiny travellers, fishermen and a temple are tucked into the folds, so the eye moves through the scroll the way a walker moves through hills.",
    lookCloser:
      "Find the three distances Guo Xi described: look up at the peak, into the valley on the right, and across to the level waters on the left.",
    traits: ["landscape", "serene", "spiritual", "muted", "stylized", "symbolic"],
  },

  // Italian Renaissance
  {
    id: "birth-of-venus",
    title: "The Birth of Venus",
    artist: "botticelli",
    year: "c. 1484–86",
    date: 1485,
    movement: "italian-renaissance",
    medium: "Tempera on canvas",
    dimensions: "172.5 × 278.9 cm",
    collection: "Uffizi Gallery, Florence",
    blurb:
      "Venus arrives on a scallop shell, blown ashore by the winds Zephyr and Aura while a Hora rushes to clothe her. One of the first large-scale pagan nudes since antiquity, painted for the Medici circle and steeped in Neoplatonic ideas of divine beauty.",
    lookCloser:
      "Botticelli picked out the highlights in Venus's hair and the trees with real gold.",
    traits: ["myth", "nude", "serene", "luminous", "cool", "precise", "stylized", "symbolic"],
  },
  {
    id: "primavera",
    title: "Primavera",
    artist: "botticelli",
    year: "c. 1477–82",
    date: 1480,
    movement: "italian-renaissance",
    medium: "Tempera on panel",
    dimensions: "202 × 314 cm",
    collection: "Uffizi Gallery, Florence",
    blurb:
      "In a dark orange grove, Venus presides over a procession that reads from right to left: Zephyr seizes the nymph Chloris, who turns into Flora, the Three Graces dance and Mercury stirs the clouds. Its exact meaning is still debated.",
    lookCloser:
      "Botanists have identified around 500 plant species across the meadow, some 190 different flowers among them.",
    traits: ["myth", "serene", "sensual", "shadow", "muted", "precise", "stylized", "crowded", "symbolic"],
  },
  {
    id: "school-of-athens",
    title: "The School of Athens",
    artist: "raphael",
    year: "1509–11",
    date: 1510,
    movement: "italian-renaissance",
    medium: "Fresco",
    dimensions: "c. 500 × 770 cm",
    collection: "Stanza della Segnatura, Vatican Palace",
    blurb:
      "The great philosophers of antiquity gather under a vast classical vault, with Plato pointing up to the realm of ideas and Aristotle gesturing down to the world of experience. A summary of the High Renaissance ideal: harmony, clarity and learning.",
    lookCloser:
      "Plato is thought to carry Leonardo's features, and the brooding Heraclitus on the steps is likely Michelangelo. Raphael put himself at the far right edge, looking out.",
    traits: ["history", "serene", "luminous", "warm", "precise", "naturalistic", "crowded"],
  },
  {
    id: "lady-with-an-ermine",
    title: "Lady with an Ermine",
    artist: "leonardo",
    year: "c. 1489–91",
    date: 1490,
    movement: "italian-renaissance",
    medium: "Oil on walnut panel",
    dimensions: "54 × 39 cm",
    collection: "National Museum, Kraków",
    blurb:
      "Cecilia Gallerani, a teenage member of the Milanese court and mistress of Ludovico Sforza, turns as if someone has just entered the room. The ermine in her arms is a pun on her name and an emblem of Ludovico himself.",
    lookCloser:
      "Watch how the ermine's twist echoes Cecilia's: the animal's paw and her long hand mirror each other.",
    traits: ["portrait", "intimate", "shadow", "muted", "precise", "naturalistic", "solitary", "symbolic"],
  },
  {
    id: "venus-of-urbino",
    title: "Venus of Urbino",
    artist: "titian",
    year: "1538",
    date: 1538,
    movement: "italian-renaissance",
    medium: "Oil on canvas",
    dimensions: "119 × 165 cm",
    collection: "Uffizi Gallery, Florence",
    blurb:
      "Commissioned by Guidobaldo della Rovere, this Venus is no distant goddess but a woman in a Venetian palazzo, meeting our gaze while maids search a chest behind her. It became the model for reclining nudes from Goya to Manet's Olympia.",
    lookCloser:
      "The sleeping dog at her feet is a traditional sign of fidelity, suggesting a marriage context rather than simple seduction.",
    traits: ["nude", "sensual", "intimate", "warm", "painterly", "naturalistic", "solitary"],
  },

  // Northern Renaissance
  {
    id: "arnolfini-portrait",
    title: "The Arnolfini Portrait",
    artist: "jan-van-eyck",
    year: "1434",
    date: 1434,
    movement: "northern-renaissance",
    medium: "Oil on oak",
    dimensions: "82.2 × 60 cm",
    collection: "National Gallery, London",
    blurb:
      "An Italian merchant and his wife stand in a Bruges interior filled with signs of wealth: oranges, a brass chandelier, a fur-lined gown, a tiny terrier. Whether it records a betrothal, a marriage or simply a status portrait is still argued over.",
    lookCloser:
      "The convex mirror reflects two more figures in the doorway, and above it the painter wrote \"Jan van Eyck was here 1434.\"",
    traits: ["portrait", "intimate", "muted", "precise", "naturalistic", "symbolic"],
  },
  {
    id: "garden-of-earthly-delights",
    title: "The Garden of Earthly Delights",
    artist: "bosch",
    year: "c. 1490–1510",
    date: 1500,
    movement: "northern-renaissance",
    medium: "Oil on oak panels (triptych)",
    dimensions: "205.5 × 384.9 cm",
    collection: "Museo del Prado, Madrid",
    blurb:
      "From left to right: Eden, a teeming garden of naked pleasure-seekers, and a hell of musical torture and burning cities. Bosch's hybrid creatures and giant fruits have fascinated viewers for five centuries and inspired the Surrealists.",
    lookCloser:
      "In the hell panel, a musical score is written on a sinner's buttocks. Musicians have transcribed and performed it.",
    traits: ["sacred", "uncanny", "vivid", "precise", "stylized", "crowded", "symbolic"],
  },
  {
    id: "durer-self-portrait",
    title: "Self-Portrait at Twenty-Eight",
    artist: "durer",
    year: "1500",
    date: 1500,
    movement: "northern-renaissance",
    medium: "Oil on panel",
    dimensions: "67.1 × 48.9 cm",
    collection: "Alte Pinakothek, Munich",
    blurb:
      "Strictly frontal, symmetrical and solemn, Dürer presents himself in a pose reserved for images of Christ. It is a bold claim for the dignity of the artist as a creator, made at the turn of the half-millennium.",
    lookCloser:
      "Look at the fur of the collar: every hair is painted individually, and the hand fingers it as if to prove the skill that made it.",
    traits: ["portrait", "spiritual", "shadow", "warm", "precise", "naturalistic", "solitary", "symbolic"],
  },
  {
    id: "the-ambassadors",
    title: "The Ambassadors",
    artist: "holbein",
    year: "1533",
    date: 1533,
    movement: "northern-renaissance",
    medium: "Oil on oak",
    dimensions: "207 × 209.5 cm",
    collection: "National Gallery, London",
    blurb:
      "Two French diplomats, Jean de Dinteville and Georges de Selve, stand beside shelves of globes, instruments and books: the learning of their age. It is a double portrait about worldly knowledge and its limits, painted in London in a year of religious crisis.",
    lookCloser:
      "The strange shape across the floor is a skull in anamorphic distortion. Stand close at the right edge and it snaps into view.",
    traits: ["portrait", "uncanny", "vivid", "precise", "naturalistic", "symbolic"],
  },
  {
    id: "hunters-in-the-snow",
    title: "Hunters in the Snow",
    artist: "bruegel",
    year: "1565",
    date: 1565,
    movement: "northern-renaissance",
    medium: "Oil on panel",
    dimensions: "117 × 162 cm",
    collection: "Kunsthistorisches Museum, Vienna",
    blurb:
      "Weary hunters trudge home with a single fox, while below them villagers skate and play on frozen ponds. Part of a cycle of the seasons painted for an Antwerp merchant, it is one of the first great winter landscapes in Western art.",
    lookCloser:
      "The sign of the inn on the left is hanging loose from one hinge, and in front of it a family is burning the bristles off a pig.",
    traits: ["landscape", "everyday", "melancholy", "cool", "muted", "precise", "naturalistic", "crowded"],
  },

  // Baroque
  {
    id: "calling-of-saint-matthew",
    title: "The Calling of Saint Matthew",
    artist: "caravaggio",
    year: "1599–1600",
    date: 1600,
    movement: "baroque",
    medium: "Oil on canvas",
    dimensions: "322 × 340 cm",
    collection: "Contarelli Chapel, San Luigi dei Francesi, Rome",
    blurb:
      "Christ enters a dim counting-house and points at the tax collector Matthew, who is counting coins with a group of fashionably dressed men. A shaft of light follows Christ's gesture across the wall. The sacred breaks into an ordinary Roman room.",
    lookCloser:
      "Christ's hand quotes Adam's hand from Michelangelo's Sistine ceiling. Scholars still debate which man at the table is Matthew.",
    traits: ["sacred", "dramatic", "shadow", "warm", "naturalistic", "crowded"],
  },
  {
    id: "judith-beheading-holofernes",
    title: "Judith Slaying Holofernes",
    artist: "artemisia-gentileschi",
    year: "c. 1612",
    date: 1612,
    movement: "baroque",
    medium: "Oil on canvas",
    dimensions: "158.8 × 125.5 cm",
    collection: "Museo di Capodimonte, Naples",
    blurb:
      "The biblical widow Judith and her maid hold down the Assyrian general and saw through his neck. Where most painters showed a hesitant heroine, Artemisia gives us two women doing hard physical work. This is the earlier of her two versions; the later one is in the Uffizi.",
    lookCloser:
      "Follow the arms: they form a pinwheel of force that all converges on the sword at the centre.",
    traits: ["sacred", "dramatic", "shadow", "warm", "vivid", "naturalistic"],
  },
  {
    id: "las-meninas",
    title: "Las Meninas",
    artist: "velazquez",
    year: "1656",
    date: 1656,
    movement: "baroque",
    medium: "Oil on canvas",
    dimensions: "318 × 276 cm",
    collection: "Museo del Prado, Madrid",
    blurb:
      "The Infanta Margarita and her maids of honour are caught in a moment, while Velázquez himself stands at a huge canvas and looks straight at us. Or at the king and queen, reflected in the mirror behind. A puzzle about seeing, painting and power.",
    lookCloser:
      "The red cross on the painter's chest is the Order of Santiago, which he received three years after finishing the picture. It was added later.",
    traits: ["portrait", "intimate", "shadow", "muted", "painterly", "naturalistic", "crowded", "symbolic"],
  },

  // Dutch Golden Age
  {
    id: "night-watch",
    title: "The Night Watch",
    artist: "rembrandt",
    year: "1642",
    date: 1642,
    movement: "dutch-golden-age",
    medium: "Oil on canvas",
    dimensions: "379.5 × 453.5 cm",
    collection: "Rijksmuseum, Amsterdam",
    blurb:
      "Militia portraits were usually tidy rows of faces. Rembrandt turned the company of Captain Frans Banninck Cocq into a burst of movement, with muskets loading, a drum rolling and a mysterious girl in gold glowing among the men. It is not a night scene: the nickname came from darkened varnish.",
    lookCloser:
      "The chicken hanging from the girl's belt shows claws, a pun on the militia's name, the Kloveniers.",
    traits: ["portrait", "history", "dramatic", "shadow", "warm", "painterly", "crowded"],
  },
  {
    id: "girl-with-a-pearl-earring",
    title: "Girl with a Pearl Earring",
    artist: "vermeer",
    year: "c. 1665",
    date: 1665,
    movement: "dutch-golden-age",
    medium: "Oil on canvas",
    dimensions: "44.5 × 39 cm",
    collection: "Mauritshuis, The Hague",
    blurb:
      "Not a portrait but a tronie, a study of an imaginary figure in exotic costume. She turns over her shoulder with parted lips against a dark ground. Recent research found the background was originally a green curtain that has faded.",
    lookCloser:
      "The famous pearl is just two strokes: a soft reflection below and a single bright highlight above.",
    traits: ["portrait", "intimate", "shadow", "cool", "precise", "naturalistic", "solitary"],
  },
  {
    id: "the-milkmaid",
    title: "The Milkmaid",
    artist: "vermeer",
    year: "c. 1658",
    date: 1658,
    movement: "dutch-golden-age",
    medium: "Oil on canvas",
    dimensions: "45.5 × 41 cm",
    collection: "Rijksmuseum, Amsterdam",
    blurb:
      "A kitchen maid pours milk with total concentration. Nothing happens, and yet everything is held in the light that falls through the window onto bread, jug and apron. Vermeer turns a humble task into something close to devotion.",
    lookCloser:
      "The bread is built from tiny dots of paint that sparkle like crust. X-rays show Vermeer painted out a clothes basket behind her.",
    traits: ["everyday", "serene", "intimate", "luminous", "cool", "vivid", "precise", "naturalistic", "solitary"],
  },
  {
    id: "still-life-gilt-cup",
    title: "Still Life with a Gilt Cup",
    artist: "heda",
    year: "1635",
    date: 1635,
    movement: "dutch-golden-age",
    medium: "Oil on panel",
    dimensions: "88 × 113 cm",
    collection: "Rijksmuseum, Amsterdam",
    blurb:
      "An overturned silver tazza, a half-peeled lemon, oysters and a glass of wine on a crumpled cloth. A quiet display of skill in reflection and texture, and a reminder that luxury, like a meal, is soon over.",
    lookCloser:
      "Find the window reflected in the glass and the metal: a single light source unifies the whole table.",
    traits: ["still-life", "serene", "melancholy", "muted", "precise", "naturalistic", "symbolic"],
  },

  // Rococo
  {
    id: "pilgrimage-to-cythera",
    title: "Pilgrimage to Cythera",
    artist: "watteau",
    year: "1717",
    date: 1717,
    movement: "rococo",
    medium: "Oil on canvas",
    dimensions: "129 × 194 cm",
    collection: "Musée du Louvre, Paris",
    blurb:
      "Couples in silk linger on the island of Venus before, or perhaps after, a journey of love. Watteau's reception piece for the Royal Academy was so new that the Academy invented a category for it: the fête galante.",
    lookCloser:
      "Read the couples from right to left as one pair in successive moments: persuading, rising, and looking back with regret.",
    traits: ["myth", "joyful", "melancholy", "sensual", "luminous", "warm", "painterly", "stylized", "crowded"],
  },
  {
    id: "the-swing",
    title: "The Swing",
    artist: "fragonard",
    year: "1767",
    date: 1767,
    movement: "rococo",
    medium: "Oil on canvas",
    dimensions: "81 × 64.2 cm",
    collection: "The Wallace Collection, London",
    blurb:
      "A young woman in a froth of pink silk is pushed on a swing by an older man, while her hidden lover in the bushes enjoys the view up her skirt. Her shoe flies off. The essence of Rococo: playful, erotic and wholly frivolous.",
    lookCloser:
      "The statue of Cupid on the left holds a finger to his lips: keep the secret.",
    traits: ["everyday", "joyful", "sensual", "luminous", "warm", "painterly", "stylized"],
  },

  // Romanticism
  {
    id: "wanderer-above-the-sea-of-fog",
    title: "Wanderer above the Sea of Fog",
    artist: "friedrich",
    year: "c. 1818",
    date: 1818,
    movement: "romanticism",
    medium: "Oil on canvas",
    dimensions: "94.8 × 74.8 cm",
    collection: "Hamburger Kunsthalle",
    blurb:
      "A man in a dark coat stands on a rocky summit, his back to us, looking out over a sea of fog pierced by distant peaks. The Rückenfigur invites us to stand in his place. Self-mastery, the sublime, or the loneliness of the modern self.",
    lookCloser:
      "The landscape is a composite of real sites in the Elbe Sandstone Mountains that Friedrich sketched separately.",
    traits: ["landscape", "spiritual", "melancholy", "luminous", "cool", "muted", "precise", "stylized", "solitary"],
  },
  {
    id: "fighting-temeraire",
    title: "The Fighting Temeraire",
    artist: "turner",
    year: "1839",
    date: 1839,
    movement: "romanticism",
    medium: "Oil on canvas",
    dimensions: "90.7 × 121.6 cm",
    collection: "National Gallery, London",
    blurb:
      "A ghostly warship that fought at Trafalgar is towed up the Thames to be broken up by a squat black steam tug, while the sun sets in a blaze of red and gold. An elegy for the age of sail, voted Britain's favourite painting in 2005.",
    lookCloser:
      "Turner took liberties: by the time of the tow, the Temeraire had already been stripped of her masts and rigging.",
    traits: ["landscape", "water", "history", "melancholy", "luminous", "warm", "vivid", "painterly"],
  },
  {
    id: "third-of-may-1808",
    title: "The Third of May 1808",
    artist: "goya",
    year: "1814",
    date: 1814,
    movement: "romanticism",
    medium: "Oil on canvas",
    dimensions: "268 × 347 cm",
    collection: "Museo del Prado, Madrid",
    blurb:
      "Napoleon's soldiers, a faceless row of rifles, execute Spanish civilians by lantern light. The central man in white throws up his arms like a crucified Christ. A new kind of war painting with no heroes, only victims.",
    lookCloser:
      "Look at his right palm: Goya has marked it with what looks like a stigma.",
    traits: ["history", "dramatic", "shadow", "muted", "painterly", "naturalistic", "crowded"],
  },
  {
    id: "raft-of-the-medusa",
    title: "The Raft of the Medusa",
    artist: "gericault",
    year: "1818–19",
    date: 1819,
    movement: "romanticism",
    medium: "Oil on canvas",
    dimensions: "491 × 716 cm",
    collection: "Musée du Louvre, Paris",
    blurb:
      "In 1816 the French frigate Méduse ran aground, and some 150 people were cast adrift on a makeshift raft. Only 15 were still alive when it was found. Géricault interviewed survivors, studied corpses and built a model of the raft to paint the moment a distant ship is sighted.",
    lookCloser:
      "The composition is two pyramids: one of despair, rising to hope in the waving figure at the top.",
    traits: ["history", "water", "dramatic", "shadow", "warm", "muted", "painterly", "naturalistic", "crowded"],
  },
  {
    id: "liberty-leading-the-people",
    title: "Liberty Leading the People",
    artist: "delacroix",
    year: "1830",
    date: 1830,
    movement: "romanticism",
    medium: "Oil on canvas",
    dimensions: "260 × 325 cm",
    collection: "Musée du Louvre, Paris",
    blurb:
      "Painted to commemorate the July Revolution of 1830, which toppled Charles X. Liberty, half goddess, half woman of the people, strides over barricade and bodies with the tricolour raised. She became Marianne, the symbol of the French Republic.",
    lookCloser:
      "The towers of Notre-Dame rise through the smoke on the right, fixing the scene in Paris.",
    traits: ["history", "dramatic", "vivid", "warm", "painterly", "crowded", "symbolic"],
  },

  // Realism
  {
    id: "the-desperate-man",
    title: "The Desperate Man (Self-Portrait)",
    artist: "courbet",
    year: "c. 1843–45",
    date: 1844,
    movement: "realism",
    medium: "Oil on canvas",
    dimensions: "45 × 54 cm",
    collection: "Private collection",
    blurb:
      "The young Courbet, newly arrived in Paris, stares out with wild eyes and hands tearing at his hair. A theatrical close-up that feels startlingly modern, almost like a film still, painted when he was in his mid-twenties.",
    lookCloser:
      "The face is pushed to the very edge of the canvas, cropping out almost everything but emotion.",
    traits: ["portrait", "dramatic", "shadow", "warm", "painterly", "naturalistic", "solitary"],
  },
  {
    id: "the-gleaners",
    title: "The Gleaners",
    artist: "millet",
    year: "1857",
    date: 1857,
    movement: "realism",
    medium: "Oil on canvas",
    dimensions: "83.5 × 110 cm",
    collection: "Musée d'Orsay, Paris",
    blurb:
      "Three peasant women stoop to gather the stalks of wheat left after harvest, the right of the rural poor. In the distance, a rich harvest is stacked and a foreman watches on horseback. Monumental and quiet, it unsettled Parisian critics who smelled revolution.",
    lookCloser:
      "The three women show the successive postures of a single movement: bending, picking, rising.",
    traits: ["everyday", "landscape", "serene", "melancholy", "luminous", "warm", "muted", "naturalistic"],
  },
  {
    id: "olympia",
    title: "Olympia",
    artist: "manet",
    year: "1863",
    date: 1863,
    movement: "realism",
    medium: "Oil on canvas",
    dimensions: "130.5 × 190 cm",
    collection: "Musée d'Orsay, Paris",
    blurb:
      "Manet reworked Titian's Venus of Urbino into a contemporary Parisian courtesan who meets our eye without shame. Shown at the Salon of 1865, it caused such outrage that guards were posted to protect it. The model was Victorine Meurent, herself a painter.",
    lookCloser:
      "Titian's sleeping dog has become a black cat with its tail up, arched and alert.",
    traits: ["nude", "sensual", "luminous", "muted", "flat", "naturalistic", "solitary"],
  },
  {
    id: "madame-x",
    title: "Madame X (Madame Pierre Gautreau)",
    artist: "sargent",
    year: "1883–84",
    date: 1884,
    movement: "realism",
    medium: "Oil on canvas",
    dimensions: "208.6 × 109.9 cm",
    collection: "The Metropolitan Museum of Art, New York",
    blurb:
      "Sargent's portrait of a celebrated Parisian beauty, all lavender-white skin and black satin in strict profile. At the 1884 Salon it was a scandal, and he soon moved to London. Years later he sold it to the Met, calling it the best thing he had done.",
    lookCloser:
      "In the original the right strap had slipped off her shoulder. After the outcry Sargent repainted it in place.",
    traits: ["portrait", "sensual", "shadow", "muted", "painterly", "naturalistic", "solitary"],
  },

  // Pre-Raphaelites
  {
    id: "ophelia",
    title: "Ophelia",
    artist: "millais",
    year: "1851–52",
    date: 1852,
    movement: "pre-raphaelites",
    medium: "Oil on canvas",
    dimensions: "76.2 × 111.8 cm",
    collection: "Tate Britain, London",
    blurb:
      "Hamlet's Ophelia floats singing to her death among the flowers. Millais spent months painting the riverbank on the Hogsmill in Surrey, then posed Elizabeth Siddal in a bath of water warmed by lamps in his studio.",
    lookCloser:
      "The flowers carry meanings from Shakespeare and the Victorian language of flowers: poppies for death, violets for faithfulness.",
    traits: ["myth", "water", "melancholy", "vivid", "cool", "precise", "naturalistic", "solitary", "symbolic"],
  },
  {
    id: "lady-of-shalott",
    title: "The Lady of Shalott",
    artist: "waterhouse",
    year: "1888",
    date: 1888,
    movement: "pre-raphaelites",
    medium: "Oil on canvas",
    dimensions: "153 × 200 cm",
    collection: "Tate Britain, London",
    blurb:
      "From Tennyson's poem: cursed to see the world only through a mirror, the Lady has looked directly at Lancelot and drifts downriver toward Camelot and death. Waterhouse paints her in the final moment of the poem, lips parted in song.",
    lookCloser:
      "Of the three candles on the prow, two have already gone out.",
    traits: ["myth", "water", "melancholy", "cool", "vivid", "painterly", "naturalistic", "solitary", "symbolic"],
  },

  // Impressionism
  {
    id: "impression-sunrise",
    title: "Impression, Sunrise",
    artist: "monet",
    year: "1872",
    date: 1872,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "48 × 63 cm",
    collection: "Musée Marmottan Monet, Paris",
    blurb:
      "The port of Le Havre dissolves in morning haze, with an orange sun and a few dark rowing boats. Shown at the first independent exhibition in 1874, it prompted the critic Louis Leroy to sneer at the \"Impressionists\". The name stuck.",
    lookCloser:
      "In a black-and-white photo the sun almost disappears: it has nearly the same tonal value as the sky.",
    traits: ["landscape", "water", "serene", "luminous", "cool", "painterly", "stylized"],
  },
  {
    id: "bal-du-moulin-de-la-galette",
    title: "Bal du moulin de la Galette",
    artist: "renoir",
    year: "1876",
    date: 1876,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "131 × 175 cm",
    collection: "Musée d'Orsay, Paris",
    blurb:
      "A Sunday afternoon dance in a Montmartre garden, with dappled sunlight filtering through the trees onto working-class Parisians and Renoir's friends. Few paintings capture the pleasure of modern leisure so completely.",
    lookCloser:
      "The light spots on the ground and on jackets are pure touches of pale paint laid on top: sunlight as texture.",
    traits: ["everyday", "joyful", "luminous", "warm", "vivid", "painterly", "crowded"],
  },
  {
    id: "the-dance-class",
    title: "The Dance Class",
    artist: "degas",
    year: "1871–74",
    date: 1873,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "85 × 75 cm",
    collection: "Musée d'Orsay, Paris",
    blurb:
      "The old ballet master Jules Perrot leans on his cane as young dancers wait, fidget and scratch between exercises. Degas was less interested in the performance than in the tired, ordinary moments backstage.",
    lookCloser:
      "Look at the girl perched on the piano at left, scratching her back while the lesson goes on.",
    traits: ["everyday", "intimate", "luminous", "cool", "painterly", "naturalistic", "crowded"],
  },
  {
    id: "the-cradle",
    title: "The Cradle",
    artist: "morisot",
    year: "1872",
    date: 1872,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "56 × 46 cm",
    collection: "Musée d'Orsay, Paris",
    blurb:
      "Morisot's sister Edma watches over her sleeping daughter Blanche through a veil of white muslin. Shown at the first Impressionist exhibition in 1874, it is tender but not sentimental, with a hint of pensive distance in the mother's look.",
    lookCloser:
      "Edma's arm and the curtain form a diagonal that links the two faces, while the gauze screens the baby from us.",
    traits: ["everyday", "intimate", "serene", "luminous", "cool", "painterly", "naturalistic"],
  },
  {
    id: "paris-street-rainy-day",
    title: "Paris Street; Rainy Day",
    artist: "caillebotte",
    year: "1877",
    date: 1877,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "212.2 × 276.2 cm",
    collection: "The Art Institute of Chicago",
    blurb:
      "A crossroads in Haussmann's newly built Paris, glistening with rain, with a fashionable couple strolling under a shared umbrella. The smooth finish and wide-angle perspective make it feel almost photographic, and oddly detached.",
    lookCloser:
      "A green lamppost splits the canvas exactly in half, dividing the intimate foreground from the empty boulevard.",
    traits: ["everyday", "melancholy", "cool", "muted", "precise", "naturalistic"],
  },
  {
    id: "bar-at-the-folies-bergere",
    title: "A Bar at the Folies-Bergère",
    artist: "manet",
    year: "1882",
    date: 1882,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "96 × 130 cm",
    collection: "The Courtauld, London",
    blurb:
      "Manet's last major work. A barmaid stands behind champagne and oranges, her expression absent, while the mirror behind her reflects the glittering crowd of the music hall and a gentleman who seems to be addressing her.",
    lookCloser:
      "The reflection doesn't add up: her back is shifted far to the right. Look for the trapeze artist's green shoes in the top left corner.",
    traits: ["everyday", "melancholy", "luminous", "vivid", "painterly", "naturalistic", "solitary"],
  },
  {
    id: "water-lily-pond",
    title: "Bridge over a Pond of Water Lilies",
    artist: "monet",
    year: "1899",
    date: 1899,
    movement: "impressionism",
    medium: "Oil on canvas",
    dimensions: "92.7 × 73.7 cm",
    collection: "The Metropolitan Museum of Art, New York",
    blurb:
      "The Japanese-style footbridge Monet built over his water garden at Giverny, surrounded by a dense screen of green. One of a series of views from 1899, painted as the garden became his almost exclusive subject.",
    lookCloser:
      "There is almost no sky: the whole surface is foliage and its reflection, a step toward the all-over Water Lilies of his late years.",
    traits: ["landscape", "water", "serene", "luminous", "cool", "painterly", "stylized"],
  },

  // Post-Impressionism
  {
    id: "starry-night",
    title: "The Starry Night",
    artist: "van-gogh",
    year: "1889",
    date: 1889,
    movement: "post-impressionism",
    medium: "Oil on canvas",
    dimensions: "73.7 × 92.1 cm",
    collection: "The Museum of Modern Art, New York",
    blurb:
      "Painted in the asylum at Saint-Rémy, from memory and imagination, of the view east from his window before sunrise. A flame-like cypress links the village to a sky churning with light. Van Gogh himself thought it a failure.",
    lookCloser:
      "The bright \"star\" just right of the cypress is probably Venus, which was visible at dawn from Saint-Rémy that June.",
    traits: ["landscape", "spiritual", "dramatic", "cool", "vivid", "painterly", "stylized"],
  },
  {
    id: "sunflowers",
    title: "Sunflowers",
    artist: "van-gogh",
    year: "1888",
    date: 1888,
    movement: "post-impressionism",
    medium: "Oil on canvas",
    dimensions: "92.1 × 73 cm",
    collection: "National Gallery, London",
    blurb:
      "Painted in Arles to decorate the room awaiting Gauguin in the Yellow House. Yellow on yellow, from fresh blooms to seed heads going to rot: a still life about the whole life cycle, and about the joy Van Gogh hoped the south would bring.",
    lookCloser:
      "Van Gogh signed it on the vase itself, as if the name were part of the pottery.",
    traits: ["still-life", "joyful", "luminous", "warm", "vivid", "painterly", "stylized"],
  },
  {
    id: "mont-sainte-victoire",
    title: "Mont Sainte-Victoire",
    artist: "cezanne",
    year: "1902–06",
    date: 1904,
    movement: "post-impressionism",
    medium: "Oil on canvas",
    dimensions: "63.8 × 81.6 cm",
    collection: "The Nelson-Atkins Museum of Art, Kansas City",
    blurb:
      "Cézanne painted this mountain above Aix dozens of times. In the late views, from his studio at Les Lauves, landscape is built from blocks of green, ochre and violet that describe both depth and the flat surface of the canvas.",
    lookCloser:
      "Step back and it's a valley and a mountain; step close and it's a mosaic of separate brushstrokes, each a decision.",
    traits: ["landscape", "serene", "luminous", "cool", "vivid", "painterly", "stylized"],
  },
  {
    id: "grande-jatte",
    title: "A Sunday on La Grande Jatte",
    artist: "seurat",
    year: "1884–86",
    date: 1885,
    movement: "post-impressionism",
    medium: "Oil on canvas",
    dimensions: "207.5 × 308.1 cm",
    collection: "The Art Institute of Chicago",
    blurb:
      "Parisians of every class relax on an island in the Seine, rendered in thousands of tiny dots of pure colour. The Impressionist theme of leisure is frozen into something geometric and strangely solemn.",
    lookCloser:
      "Seurat later added a painted border of dots around the edge, to control how the picture meets its frame.",
    traits: ["everyday", "landscape", "water", "serene", "luminous", "vivid", "stylized", "crowded"],
  },
  {
    id: "where-do-we-come-from",
    title: "Where Do We Come From? What Are We? Where Are We Going?",
    artist: "gauguin",
    year: "1897–98",
    date: 1897,
    movement: "post-impressionism",
    medium: "Oil on canvas",
    dimensions: "139.1 × 374.6 cm",
    collection: "Museum of Fine Arts, Boston",
    blurb:
      "Gauguin's largest painting, made in Tahiti in a period of illness and despair. To be read from right to left, like a frieze, from a sleeping infant to an old woman near death, with an idol presiding over the cycle of life.",
    lookCloser:
      "The title is written in the top left corner, on a gold patch that looks like a worn fresco.",
    traits: ["myth", "spiritual", "melancholy", "warm", "vivid", "flat", "stylized", "crowded", "symbolic"],
  },

  // Symbolism
  {
    id: "the-scream",
    title: "The Scream",
    artist: "munch",
    year: "1893",
    date: 1893,
    movement: "symbolism",
    medium: "Tempera and crayon on cardboard",
    dimensions: "91 × 73.5 cm",
    collection: "National Museum, Oslo",
    blurb:
      "Munch described walking at sunset when the sky turned blood red and he sensed \"an infinite scream passing through nature.\" The figure is less a person than a condition: anxiety given shape.",
    lookCloser:
      "In the red sky, a tiny pencilled inscription reads \"Could only have been painted by a madman.\" Research shows it is in Munch's own hand.",
    traits: ["landscape", "uncanny", "dramatic", "warm", "vivid", "painterly", "stylized", "solitary"],
  },
  {
    id: "isle-of-the-dead",
    title: "Isle of the Dead (third version)",
    artist: "bocklin",
    year: "1883",
    date: 1883,
    movement: "symbolism",
    medium: "Oil on panel",
    dimensions: "80 × 150 cm",
    collection: "Alte Nationalgalerie, Berlin",
    blurb:
      "A small boat carries a white-shrouded figure and a coffin toward a rocky island of cypresses and tombs. Böcklin painted five versions and never explained it. Rachmaninoff wrote a tone poem after it, and Hitler later owned this one.",
    lookCloser:
      "Böcklin called it \"a picture for dreaming\": note the water, perfectly still, without a single ripple.",
    traits: ["landscape", "water", "uncanny", "melancholy", "shadow", "muted", "precise", "stylized", "symbolic"],
  },

  // Vienna Secession
  {
    id: "the-kiss",
    title: "The Kiss",
    artist: "klimt",
    year: "1907–08",
    date: 1908,
    movement: "vienna-secession",
    medium: "Oil and gold leaf on canvas",
    dimensions: "180 × 180 cm",
    collection: "Belvedere, Vienna",
    blurb:
      "Two lovers embrace on a flowering meadow at the edge of an abyss, wrapped in a single golden cloak. His robe is patterned with black and white rectangles, hers with circles and flowers. The high point of Klimt's golden phase, bought by the Austrian state before it was finished.",
    lookCloser:
      "Her toes curl over the edge of the flower bed, where the ground simply ends.",
    traits: ["intimate", "sensual", "gold", "warm", "flat", "stylized", "symbolic"],
  },

  // Expressionism
  {
    id: "self-portrait-with-physalis",
    title: "Self-Portrait with Physalis",
    artist: "schiele",
    year: "1912",
    date: 1912,
    movement: "expressionism",
    medium: "Oil and opaque colour on wood",
    dimensions: "32.2 × 39.8 cm",
    collection: "Leopold Museum, Vienna",
    blurb:
      "Schiele's head twists over his shoulder, eyes narrowed, against an empty white ground. A companion to his portrait of Wally Neuzil, it shows the self as something nervous and exposed, pinned like a specimen.",
    lookCloser:
      "The Chinese lantern plant beside him mirrors the red of his lips and eyelids.",
    traits: ["portrait", "uncanny", "intimate", "luminous", "muted", "flat", "stylized", "solitary"],
  },
  {
    id: "large-blue-horses",
    title: "The Large Blue Horses",
    artist: "marc",
    year: "1911",
    date: 1911,
    movement: "expressionism",
    medium: "Oil on canvas",
    dimensions: "105.7 × 181.1 cm",
    collection: "Walker Art Center, Minneapolis",
    blurb:
      "Three horses merge into a single rhythmic form, their curves answered by the red hills behind them. For Marc, blue was the colour of spirit, and animals offered a purity the modern world had lost.",
    lookCloser:
      "The horses' rounded backs and the curves of the hills rhyme almost exactly.",
    traits: ["landscape", "spiritual", "joyful", "vivid", "cool", "flat", "stylized", "crowded", "symbolic"],
  },

  // Early Abstraction
  {
    id: "ten-largest-no-7",
    title: "The Ten Largest, No. 7, Adulthood",
    artist: "af-klint",
    year: "1907",
    date: 1907,
    movement: "early-abstraction",
    medium: "Tempera on paper, mounted on canvas",
    dimensions: "315 × 235 cm",
    collection: "The Hilma af Klint Foundation, Stockholm",
    blurb:
      "Part of a series of ten huge panels on the stages of human life, from childhood to old age. Spirals, petals and letters float on a lavender ground. Painted years before Kandinsky's first abstractions, and almost unseen until the 1980s.",
    lookCloser:
      "The panels were painted on paper laid on the floor, so af Klint worked from above, sometimes on her knees.",
    traits: ["nonfigurative", "spiritual", "joyful", "luminous", "warm", "vivid", "flat", "symbolic"],
  },
  {
    id: "composition-vii",
    title: "Composition VII",
    artist: "kandinsky",
    year: "1913",
    date: 1913,
    movement: "early-abstraction",
    medium: "Oil on canvas",
    dimensions: "200 × 300 cm",
    collection: "State Tretyakov Gallery, Moscow",
    blurb:
      "A storm of colour and line that Kandinsky considered the most complex work he made before the war. Behind the turbulence lie themes of resurrection, the Last Judgement and the Flood, dissolved into pure abstraction.",
    lookCloser:
      "He made more than thirty preparatory studies, then painted the final canvas in about four days.",
    traits: ["nonfigurative", "dramatic", "spiritual", "vivid", "painterly", "crowded"],
  },
  {
    id: "black-square",
    title: "Black Square",
    artist: "malevich",
    year: "1915",
    date: 1915,
    movement: "early-abstraction",
    medium: "Oil on linen",
    dimensions: "79.5 × 79.5 cm",
    collection: "State Tretyakov Gallery, Moscow",
    blurb:
      "The zero point of painting. At the \"0.10\" exhibition in Petrograd, Malevich hung it high across the corner of the room, the place reserved for the icon in a Russian home. Today the surface is crazed with cracks.",
    lookCloser:
      "X-rays and infrared studies revealed earlier compositions underneath, and a faint pencilled inscription on the white border.",
    traits: ["nonfigurative", "spiritual", "uncanny", "shadow", "muted", "flat", "solitary"],
  },
  {
    id: "composition-red-blue-yellow",
    title: "Composition II in Red, Blue, and Yellow",
    artist: "mondrian",
    year: "1930",
    date: 1930,
    movement: "early-abstraction",
    medium: "Oil on canvas",
    dimensions: "46 × 46 cm",
    collection: "Kunsthaus Zürich",
    blurb:
      "A large red square dominates, balanced by a small blue one and a sliver of yellow within a grid of black lines. Mondrian sought a universal harmony through the tension of asymmetry, stripped of anything personal.",
    lookCloser:
      "The white areas are not all the same white: some are cooler and some slightly grey.",
    traits: ["nonfigurative", "serene", "luminous", "vivid", "flat"],
  },

  // Ukiyo-e
  {
    id: "great-wave",
    title: "The Great Wave off Kanagawa",
    artist: "hokusai",
    year: "c. 1830–32",
    date: 1831,
    movement: "ukiyo-e",
    medium: "Woodblock print, ink and colour on paper",
    dimensions: "25.7 × 37.9 cm",
    collection: "The Metropolitan Museum of Art, New York (this impression)",
    blurb:
      "A monstrous wave curls over three boats of rowers, with Mount Fuji small and still in the distance. From the series Thirty-six Views of Mount Fuji, it used the newly imported Prussian blue and became perhaps the most famous image in Asian art.",
    lookCloser:
      "The wave's crest breaks into claw-like fingers of foam, and its curve frames Fuji like a second, tiny wave.",
    traits: ["landscape", "water", "dramatic", "cool", "flat", "stylized"],
  },
  {
    id: "sudden-shower",
    title: "Sudden Shower over Shin-Ōhashi Bridge and Atake",
    artist: "hiroshige",
    year: "1857",
    date: 1857,
    movement: "ukiyo-e",
    medium: "Woodblock print, ink and colour on paper",
    dimensions: "c. 36 × 24 cm",
    collection: "Library of Congress, Washington (this impression)",
    blurb:
      "Figures hunch under hats and mats as a summer downpour sweeps across a bridge on the Sumida River. From One Hundred Famous Views of Edo. Van Gogh painted a copy of it in oils in 1887.",
    lookCloser:
      "The rain is cut as two sets of lines at slightly different angles, printed from separate blocks.",
    traits: ["everyday", "landscape", "water", "melancholy", "cool", "muted", "flat", "stylized"],
  },
];
