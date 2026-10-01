export type Movement = {
  id: string;
  name: string;
  start: number;
  end: number;
  region: string;
  summary: string;
  hallmarks: string[];
  wiki: string;
};

// Sorted chronologically in src/data/index.ts.
export const MOVEMENTS: Movement[] = [
  {
    id: "song-landscape",
    name: "Northern Song Landscape",
    start: 960,
    end: 1127,
    region: "China",
    summary:
      "Under the Northern Song dynasty, monumental landscape became the highest genre of Chinese painting. Towering peaks stood for cosmic and social order, and the painter's task was to capture the living spirit of mountains and water rather than a single view. Space is built from layered ink, mist and several viewpoints at once, inviting the eye to wander through the scroll as if on foot.",
    hallmarks: [
      "Ink and light colour on silk",
      "Guo Xi's \"three distances\": high, deep and level",
      "Mist as a way to create depth",
      "Mountains as an image of moral order",
    ],
    wiki: "https://en.wikipedia.org/wiki/Song_dynasty_painting",
  },
  {
    id: "northern-renaissance",
    name: "Northern Renaissance",
    start: 1430,
    end: 1580,
    region: "Low Countries & Germany",
    summary:
      "North of the Alps, painters perfected oil glazing and used it to render the visible world with almost microscopic precision: the gleam of brass, the fur of a lapdog, the reflection in a convex mirror. Ordinary objects often carry symbolic weight, and the rise of printmaking let artists like Dürer build international reputations.",
    hallmarks: [
      "Jewel-like oil glazes",
      "Obsessive surface detail",
      "Everyday objects loaded with meaning",
      "Printmaking and artistic self-promotion",
    ],
    wiki: "https://en.wikipedia.org/wiki/Northern_Renaissance",
  },
  {
    id: "italian-renaissance",
    name: "Italian Renaissance",
    start: 1400,
    end: 1600,
    region: "Florence, Rome & Venice",
    summary:
      "A revival of classical antiquity driven by humanist scholars and wealthy patrons. Artists developed linear perspective, studied anatomy and proportion, and recast Christian and pagan subjects with new naturalism and ideal beauty. Florence prized disegno, the clarity of drawing; Venice answered with colore, the warmth of pigment and light.",
    hallmarks: [
      "Linear perspective",
      "Classical ideals of proportion",
      "Humanism and the revival of antiquity",
      "Florentine disegno versus Venetian colore",
    ],
    wiki: "https://en.wikipedia.org/wiki/Italian_Renaissance_painting",
  },
  {
    id: "baroque",
    name: "Baroque",
    start: 1600,
    end: 1720,
    region: "Italy, Spain & Flanders",
    summary:
      "Born partly out of the Counter-Reformation's call for art that moves the faithful, Baroque painting seizes the most dramatic instant of a story and stages it in raking light. Caravaggio's tenebrism, with figures emerging from darkness, spread across Europe and shaped painters from Naples to Seville.",
    hallmarks: [
      "Tenebrism and hard, directional light",
      "The climactic moment of a story",
      "Diagonal, dynamic compositions",
      "Direct emotional appeal to the viewer",
    ],
    wiki: "https://en.wikipedia.org/wiki/Baroque_painting",
  },
  {
    id: "dutch-golden-age",
    name: "Dutch Golden Age",
    start: 1600,
    end: 1700,
    region: "Dutch Republic",
    summary:
      "In a Protestant republic with few church commissions, painters sold to merchants and burghers on an open market. The result was a boom in portraits, landscapes, still lifes and quiet domestic scenes, painted with extraordinary attention to light as it falls through a window onto everyday things.",
    hallmarks: [
      "An open art market instead of church patronage",
      "Genre scenes of daily life",
      "Still life and vanitas",
      "Soft window light",
    ],
    wiki: "https://en.wikipedia.org/wiki/Dutch_Golden_Age_painting",
  },
  {
    id: "rococo",
    name: "Rococo",
    start: 1715,
    end: 1775,
    region: "France",
    summary:
      "After the death of Louis XIV, French aristocratic taste turned from grandeur to pleasure. Rococo painting favours pastel colour, feathery brushwork and scenes of flirtation in dreamlike gardens. Watteau's fêtes galantes and Fragonard's playful eroticism define a world of elegance that the Revolution would sweep away.",
    hallmarks: [
      "Pastel palette and feathery touch",
      "Fêtes galantes and aristocratic leisure",
      "Playful, often erotic, subject matter",
      "Asymmetry and ornament",
    ],
    wiki: "https://en.wikipedia.org/wiki/Rococo",
  },
  {
    id: "romanticism",
    name: "Romanticism",
    start: 1790,
    end: 1850,
    region: "Europe",
    summary:
      "A reaction against Enlightenment reason and Neoclassical restraint. Romantic painters put feeling first: awe before the sublime power of nature, horror at war and disaster, passion for liberty and national identity. Brushwork loosens, skies take over, and the individual stands small against forces larger than himself.",
    hallmarks: [
      "The sublime in nature",
      "Emotion over reason",
      "Contemporary disasters and revolutions",
      "Expressive colour and loose handling",
    ],
    wiki: "https://en.wikipedia.org/wiki/Romanticism",
  },
  {
    id: "realism",
    name: "Realism",
    start: 1840,
    end: 1890,
    region: "France",
    summary:
      "Realists rejected idealised history painting and insisted on painting what they could see: peasants, labourers, prostitutes, the modern city. Courbet declared he could not paint an angel because he had never seen one. The movement's frankness shocked the Salon and paved the way for Impressionism.",
    hallmarks: [
      "Ordinary people as serious subjects",
      "Rejection of academic idealisation",
      "Social and political edge",
      "Earthy, sober palette",
    ],
    wiki: "https://en.wikipedia.org/wiki/Realism_(art_movement)",
  },
  {
    id: "pre-raphaelites",
    name: "Pre-Raphaelites",
    start: 1848,
    end: 1900,
    region: "England",
    summary:
      "Founded in 1848 by Millais, Rossetti and Holman Hunt, the Pre-Raphaelite Brotherhood looked back to art before Raphael for sincerity and detail. They painted literary and medieval subjects in brilliant colour on a white ground, rendering every leaf and petal from nature.",
    hallmarks: [
      "Brilliant colour over a white ground",
      "Botanical precision",
      "Literary and Arthurian subjects",
      "Idealised, melancholic women",
    ],
    wiki: "https://en.wikipedia.org/wiki/Pre-Raphaelite_Brotherhood",
  },
  {
    id: "impressionism",
    name: "Impressionism",
    start: 1860,
    end: 1890,
    region: "France",
    summary:
      "Working outdoors and in modern Paris, the Impressionists tried to catch fleeting effects of light and atmosphere with quick, broken strokes of unmixed colour. Rejected by the official Salon, they held their own exhibitions from 1874. A critic mocked Monet's Impression, Sunrise and gave the group its name.",
    hallmarks: [
      "Painting en plein air",
      "Broken brushwork and unmixed colour",
      "Modern life and leisure",
      "Light and atmosphere as the true subject",
    ],
    wiki: "https://en.wikipedia.org/wiki/Impressionism",
  },
  {
    id: "post-impressionism",
    name: "Post-Impressionism",
    start: 1886,
    end: 1905,
    region: "France",
    summary:
      "Not a single style but a generation that took Impressionism's freedoms somewhere new. Cézanne rebuilt nature from planes of colour, Seurat systematised it into dots, Van Gogh charged it with emotion, and Gauguin looked for meaning in symbol and flat colour. Modern art grows from all four.",
    hallmarks: [
      "Structure and geometry beneath appearances",
      "Colour used for emotion or symbol",
      "Pointillism and colour theory",
      "Bold outlines and flat areas",
    ],
    wiki: "https://en.wikipedia.org/wiki/Post-Impressionism",
  },
  {
    id: "symbolism",
    name: "Symbolism",
    start: 1880,
    end: 1910,
    region: "Europe",
    summary:
      "Symbolists turned away from the observable world toward dreams, myth, death and the psyche. Their images suggest rather than describe, aiming at states of mind that words cannot hold. The movement fed directly into Expressionism and, later, Surrealism.",
    hallmarks: [
      "Dreams, death and the inner life",
      "Suggestion over description",
      "Mystery and ambiguity",
      "Emotion expressed through form and colour",
    ],
    wiki: "https://en.wikipedia.org/wiki/Symbolism_(arts)",
  },
  {
    id: "vienna-secession",
    name: "Vienna Secession",
    start: 1897,
    end: 1918,
    region: "Vienna",
    summary:
      "In 1897 Gustav Klimt and fellow artists broke from Vienna's conservative academy, declaring \"To every age its art, to art its freedom.\" Their work fused fine and decorative art, drawing on Byzantine mosaics, Japanese prints and Art Nouveau line, and treated eroticism and the psyche with new openness.",
    hallmarks: [
      "Gold leaf and flat ornament",
      "Unity of fine and decorative art",
      "Sinuous Art Nouveau line",
      "Frank treatment of desire",
    ],
    wiki: "https://en.wikipedia.org/wiki/Vienna_Secession",
  },
  {
    id: "expressionism",
    name: "Expressionism",
    start: 1905,
    end: 1925,
    region: "Germany & Austria",
    summary:
      "Expressionists distorted form and colour to convey inner experience rather than outward appearance. In Dresden, Munich and Vienna, groups like Die Brücke and Der Blaue Reiter pursued raw feeling, spiritual renewal and psychological intensity. The First World War cut many careers short.",
    hallmarks: [
      "Distortion for emotional effect",
      "Non-naturalistic, symbolic colour",
      "Psychological intensity",
      "Spiritual longing",
    ],
    wiki: "https://en.wikipedia.org/wiki/Expressionism",
  },
  {
    id: "early-abstraction",
    name: "Early Abstraction",
    start: 1906,
    end: 1930,
    region: "Europe",
    summary:
      "Within a few years, painters in Stockholm, Munich, Moscow and Amsterdam independently abandoned the depiction of things. Many were driven by spiritual ideas such as Theosophy: colour and form could speak directly, like music. Suprematism and De Stijl pushed the idea to pure geometry.",
    hallmarks: [
      "No recognisable subject",
      "Colour and form as a language in themselves",
      "Spiritual and mystical ambitions",
      "Pure geometry",
    ],
    wiki: "https://en.wikipedia.org/wiki/Abstract_art",
  },
  {
    id: "ukiyo-e",
    name: "Ukiyo-e",
    start: 1670,
    end: 1900,
    region: "Edo, Japan",
    summary:
      "\"Pictures of the floating world\": woodblock prints made for the townspeople of Edo, depicting actors, courtesans, travel and landscape. Produced in large editions by teams of designer, carver and printer, they reached Europe in the 1850s and 60s and transformed Western painting.",
    hallmarks: [
      "Multi-block colour printing",
      "Flat colour and strong outline",
      "Bold, cropped compositions",
      "Popular subjects for an urban public",
    ],
    wiki: "https://en.wikipedia.org/wiki/Ukiyo-e",
  },
];
