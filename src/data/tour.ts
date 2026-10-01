// The Grand Tour: a guided route through the collection, room by room.
// Each room is an epoch; the bridge explains how history leads into the next.

export type TourRoom = {
  movement: string;
  /** Works from other epochs shown first in this room, e.g. a key forerunner. */
  include?: string[];
  /** Leads the visitor into the next room. The last room has none. */
  bridge?: string;
};

export const GRAND_TOUR: TourRoom[] = [
  {
    movement: "prehistoric-art",
    bridge:
      "For tens of thousands of years, art was small enough to carry. Then, in the river valleys of Mesopotamia, people built the first cities, invented writing, and needed images of their gods and kings.",
  },
  {
    movement: "ancient-near-east",
    bridge:
      "At almost the same moment, along the Nile, a single kingdom formed around a ruler who was also a god. Its artists fixed rules that would hold for three thousand years.",
  },
  {
    movement: "ancient-egypt",
    bridge:
      "Early Greek sculptors learned from Egypt's upright, striding figures, then slowly loosened them. Within two centuries they had taught marble to shift its weight and seem to breathe.",
  },
  {
    movement: "classical-antiquity",
    bridge:
      "As Rome's western empire fell, Christian art turned from the beauty of the body to the life of the soul. Gold replaced the sky, and saints looked straight out at the faithful.",
  },
  {
    movement: "medieval-europe",
    bridge:
      "Meanwhile, at the far end of Eurasia, painters of the Song dynasty were making mountains, mist and water the highest subject a painter could attempt.",
  },
  {
    movement: "song-landscape",
    bridge:
      "Back in Europe, around 1400, Florentine artists and scholars rediscovered the art and learning of ancient Rome, and armed themselves with a new tool: linear perspective.",
  },
  {
    movement: "italian-renaissance",
    bridge:
      "At the same time, north of the Alps, painters perfected oil paint and turned it on the visible world with an almost microscopic attention.",
  },
  {
    movement: "northern-renaissance",
    bridge:
      "After the Reformation split Western Christianity, the Catholic Church asked for art that would move the faithful. Caravaggio answered with darkness and a single beam of light.",
  },
  {
    movement: "baroque",
    bridge:
      "In the Protestant Dutch Republic, churches commissioned almost nothing. Painters sold to merchants on an open market instead, and turned to portraits, landscapes and quiet rooms.",
  },
  {
    movement: "dutch-golden-age",
    bridge:
      "A century and a half later, revolution and industry shook Europe. Romantic painters answered the age of reason with feeling, and set small figures against vast storms.",
  },
  {
    movement: "romanticism",
    bridge:
      "Meanwhile in Edo, today's Tokyo, printmakers were producing bold, flat images of travel, theatre and landscape. When those prints reached Paris in the 1860s, they changed European painting.",
  },
  {
    movement: "ukiyo-e",
    bridge:
      "In Paris a group of young painters, rejected by the official Salon, took their easels outdoors to catch light as it changed, and borrowed the cropped, bold compositions of Japanese prints.",
  },
  {
    movement: "impressionism",
    bridge:
      "The next generation kept Impressionism's freedom but wanted more from it: structure for Cézanne, science for Seurat, emotion for Van Gogh, symbol for Gauguin.",
  },
  {
    movement: "post-impressionism",
    bridge:
      "In Vienna in 1897, Gustav Klimt and his friends broke away from the conservative academy. Their Secession fused painting with ornament and gold, and treated desire with a new frankness.",
  },
  {
    movement: "vienna-secession",
    bridge:
      "Klimt's young protégé Egon Schiele pushed his line into something raw and nervous. In Vienna, Dresden and Munich, painters following Van Gogh and Munch began to distort form and colour to show what they felt rather than what they saw.",
  },
  {
    movement: "expressionism",
    // Munch's Scream (filed under Symbolism) is where Expressionism begins.
    include: ["the-scream"],
    bridge:
      "Some went further still. In the decade around 1910, painters in Stockholm, Munich, Moscow and the Netherlands, each on their own, let go of the visible world altogether.",
  },
  { movement: "early-abstraction" },
];

/** Works shown per room. */
export const WORKS_PER_ROOM = 3;

export type TourRoute = {
  id: string;
  name: string;
  span: string;
  description: string;
  rooms: string[];
  /** The works pictured on the route's card, in order. */
  showcase: string[];
};

const rooms = (from: string, to: string) => {
  const all = GRAND_TOUR.map((r) => r.movement);
  return all.slice(all.indexOf(from), all.indexOf(to) + 1);
};

/**
 * The three exhibitions, one after another through history. Each can be visited
 * alone; at the end of one, a doorway leads on to the next.
 */
export const ROUTES: TourRoute[] = [
  {
    id: "ancient-worlds",
    name: "Ancient Worlds",
    span: "40,000 BCE to 400 CE",
    description:
      "From Ice Age carvings and the first cities of Mesopotamia through the Egypt of the pharaohs to the marble and bronze of Greece and Rome.",
    rooms: rooms("prehistoric-art", "classical-antiquity"),
    showcase: ["mask-of-tutankhamun", "venus-de-milo", "bust-of-queen-nefertiti", "venus-of-willendorf", "laocoon-and-his-sons", "code-of-hammurabi"],
  },
  {
    id: "old-masters",
    name: "The Old Masters",
    span: "400 to 1700",
    description:
      "Byzantine gold and Gothic altarpieces, the ink landscapes of Song China, Leonardo, Raphael and van Eyck, then Caravaggio, Rembrandt and Vermeer.",
    rooms: rooms("medieval-europe", "dutch-golden-age"),
    showcase: ["mona-lisa", "night-watch", "girl-with-a-pearl-earring", "arnolfini-portrait", "las-meninas", "birth-of-venus"],
  },
  {
    id: "modern-eye",
    name: "The Modern Eye",
    span: "1800 to 1930",
    description:
      "Romantic storms and Japanese prints, the Impressionists' light, Van Gogh and Cézanne, Klimt's gold, the Expressionists' cry and the first abstract paintings.",
    rooms: rooms("romanticism", "early-abstraction"),
    showcase: ["starry-night", "the-kiss", "the-scream", "great-wave", "impression-sunrise", "large-blue-horses"],
  },
];

/** Routes that used to exist, and the exhibition that now covers them. */
export const ROUTE_ALIASES: Record<string, string> = {
  complete: "ancient-worlds",
  "renaissance-to-modern": "old-masters",
  "two-thousand-years": "old-masters",
};
