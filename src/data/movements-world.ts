import type { Movement } from "./movements";

// Epochs beyond the original 16: antiquity, the medieval world, later European
// schools, and art from Asia, Africa, the Americas and Oceania.
export const WORLD_MOVEMENTS: Movement[] = [
  {
    id: "ancient-egypt",
    name: "Ancient Egypt",
    start: -3100,
    end: 300,
    region: "Egypt",
    summary: "For three thousand years Egyptian art served the king, the gods and the dead. Its conventions, fixed early and revived again and again, show each part of the body from its most characteristic angle and arrange figures in registers scaled by rank. Most of what survives was made for tombs and temples, to sustain life in eternity rather than to be admired by the living, and it was carved, painted and cast with extraordinary precision.",
    hallmarks: [
      "Composite view of the human figure",
      "Hierarchical scale and ordered registers",
      "Hieroglyphs woven into the image",
      "Art made for eternity, not display"
    ],
    wiki: "https://en.wikipedia.org/wiki/Art_of_ancient_Egypt"
  },
  {
    id: "classical-antiquity",
    name: "Greek and Roman Antiquity",
    start: -3000,
    end: 400,
    region: "Mediterranean",
    summary: "From Cycladic marble idols to the portrait busts of imperial Rome, the art of the ancient Mediterranean moved toward an ever more convincing image of the human body. Greek sculptors of the fifth century BCE fixed an ideal of balanced, athletic naturalism, while vase painters told the myths in lively line. Rome absorbed that legacy and added unflinching portraiture, narrative relief and a taste for copies of Greek masterpieces that spread across the empire.",
    hallmarks: [
      "The idealised human body",
      "Contrapposto and harmonious proportion",
      "Myth told on painted pottery",
      "Unflinching Roman portraiture"
    ],
    wiki: "https://en.wikipedia.org/wiki/Classical_antiquity"
  },
  {
    id: "medieval-europe",
    name: "Medieval Europe",
    start: 400,
    end: 1400,
    region: "Europe & Byzantium",
    summary: "For a thousand years after Rome, European art was above all an art of faith. Byzantine icons and mosaics set holy figures against fields of gold, Romanesque carvers filled church portals with visions of judgement, and Gothic workshops produced soaring stained glass, ivory devotional carvings and jewel-like illuminated manuscripts. Precious materials and symbolic colour mattered more than illusion, because these objects were meant to open a window onto the sacred.",
    hallmarks: [
      "Gold grounds and precious materials",
      "Hierarchy and symbolic colour",
      "Illuminated manuscripts",
      "Art in the service of the Church"
    ],
    wiki: "https://en.wikipedia.org/wiki/Medieval_art"
  },
  {
    id: "mannerism",
    name: "Mannerism",
    start: 1520,
    end: 1600,
    region: "Italy & Northern Europe",
    summary: "In the generation after Raphael and Michelangelo, artists pushed the High Renaissance ideal toward refinement and artifice. Figures grow elongated and twisting, colours turn acid and unexpected, and space becomes crowded or ambiguous. Prized at princely courts in Florence, Fontainebleau and Prague, Mannerism valued wit, virtuosity and grace over calm balance, and its restless energy carried on in the work of El Greco.",
    hallmarks: [
      "Elongated, serpentine figures",
      "Artificial, often acidic colour",
      "Compressed or ambiguous space",
      "Courtly elegance and virtuosity"
    ],
    wiki: "https://en.wikipedia.org/wiki/Mannerism"
  },
  {
    id: "neoclassicism",
    name: "Neoclassicism",
    start: 1760,
    end: 1830,
    region: "Europe & America",
    summary: "The excavation of Herculaneum and Pompeii and the writings of Winckelmann turned taste back toward the clarity of Greek and Roman art. Neoclassical painters and sculptors favoured crisp contours, frieze-like compositions and stories of civic virtue and sacrifice, a style that suited the ideals of the American and French revolutions and then the image-making of Napoleon's empire. Canova and Houdon gave it marble form; David and Ingres made it the language of the Paris Salon.",
    hallmarks: [
      "Clear contour and smooth finish",
      "Frieze-like, balanced compositions",
      "Subjects of virtue and sacrifice",
      "Direct borrowing from ancient sculpture"
    ],
    wiki: "https://en.wikipedia.org/wiki/Neoclassicism"
  },
  {
    id: "academic-art",
    name: "Academic Art",
    start: 1830,
    end: 1900,
    region: "France & Europe",
    summary: "The official art of the nineteenth-century Salons, taught at the École des Beaux-Arts and its counterparts across Europe. Academic painters trained for years drawing from casts and the live model, and produced polished history paintings, mythologies and Orientalist scenes with an invisible brush. Hugely popular and richly rewarded in their day, they became the establishment that Realists and Impressionists defined themselves against.",
    hallmarks: [
      "Flawless, polished finish",
      "Mastery of the academic nude",
      "History, myth and Orientalist subjects",
      "Success at the official Salon"
    ],
    wiki: "https://en.wikipedia.org/wiki/Academic_art"
  },
  {
    id: "chinese-art",
    name: "Chinese Art",
    start: -1600,
    end: 1912,
    region: "China",
    summary: "Chinese art spans more than three thousand years, from the ritual bronzes of the Shang and Zhou dynasties to the porcelain and painting of the Qing court. Bronze vessels and jades served ancestors and rulers, and tomb figures of the Han and Tang furnished the afterlife. Later, scholar-officials made ink painting and calligraphy the most admired arts, prizing personal expression and dialogue with past masters, while the imperial kilns at Jingdezhen set a standard for porcelain the whole world tried to copy.",
    hallmarks: [
      "Ritual bronzes and jades",
      "Ink painting and calligraphy as one art",
      "Allusion to earlier masters",
      "Porcelain from the imperial kilns"
    ],
    wiki: "https://en.wikipedia.org/wiki/Chinese_art"
  },
  {
    id: "japanese-art",
    name: "Classical Japanese Art",
    start: 600,
    end: 1900,
    region: "Japan",
    summary: "Before and alongside the popular woodblock print, Japanese art moved between devotion, courtly refinement and bold decoration. Buddhist sculpture and painting arrived from Korea and China and took on a native calm; the Heian court developed narrative handscrolls steeped in poetry; and in the Momoyama and Edo periods painters of the Kano and Rinpa schools covered folding screens with gold leaf, pines, waves and seasonal flowers. Tea ceramics and lacquer brought the same eye for asymmetry and material into everyday ritual.",
    hallmarks: [
      "Gold-leaf folding screens",
      "Seasonal imagery and poetry",
      "Asymmetry and open space",
      "Buddhist icons of quiet presence"
    ],
    wiki: "https://en.wikipedia.org/wiki/Japanese_art"
  },
  {
    id: "hindu-buddhist-art",
    name: "Hindu and Buddhist Art",
    start: -250,
    end: 1800,
    region: "South & Southeast Asia, Himalayas",
    summary: "Across India, the Himalayas and Southeast Asia, sculpture and painting gave visible form to gods, Buddhas and bodhisattvas for worship in temples, monasteries and household shrines. From the Greco-Buddhist carvings of Gandhara to the Chola bronzes of Tamil Nadu and the stone deities of Angkor, artists followed canonical proportions and a precise vocabulary of gestures, postures and attributes. The ideal body is smooth, full of inner breath and poised either in movement or in deep calm.",
    hallmarks: [
      "Mudras, the symbolic hand gestures",
      "Iconographic attributes for each deity",
      "Supple, breath-filled bodies",
      "Images made for worship and procession"
    ],
    wiki: "https://en.wikipedia.org/wiki/Indian_art"
  },
  {
    id: "mughal-rajput",
    name: "Mughal and Rajput Painting",
    start: 1560,
    end: 1900,
    region: "India",
    summary: "At the court of Akbar, Persian-trained masters and Indian painters created a new school of manuscript and album painting, joining Persian refinement to lively observation of people, animals and events. Under Jahangir and Shah Jahan, Mughal artists perfected the naturalistic portrait and the botanical study. In the Rajput kingdoms of Rajasthan and the Punjab Hills, painters answered with bold colour, flattened space and devotional images of Krishna and Radha.",
    hallmarks: [
      "Opaque watercolour and gold on paper",
      "Jewel-like detail and decorated borders",
      "Court portraits and chronicles",
      "Devotional imagery of Krishna"
    ],
    wiki: "https://en.wikipedia.org/wiki/Mughal_painting"
  },
  {
    id: "islamic-art",
    name: "Arts of the Islamic World",
    start: 650,
    end: 1900,
    region: "From Spain to India",
    summary: "Islamic art unites a vast territory, from Spain to India, through shared values rather than a single style. Calligraphy, the art of writing the word of God, holds the highest rank, and geometric and vegetal ornament spreads across tiles, carpets, metalwork and manuscripts in patterns that suggest infinity. Religious settings avoid figurative imagery, but the courts of Persia, the Ottoman Empire and Central Asia produced richly illustrated books of epic poetry and history.",
    hallmarks: [
      "Calligraphy as the highest art",
      "Geometric and arabesque ornament",
      "Lustreware, carpets and inlaid metal",
      "Illustrated Persian epics"
    ],
    wiki: "https://en.wikipedia.org/wiki/Islamic_art"
  },
  {
    id: "arts-of-africa",
    name: "Arts of Africa",
    start: -500,
    end: 1950,
    region: "Sub-Saharan Africa",
    summary: "The sculpture of sub-Saharan Africa was made to act in the world: to honour ancestors, empower rulers, heal, judge and entertain in masquerade. The terracottas of Nok, the cast heads of Ife and the brass plaques of the Benin kingdom are court art of great technical sophistication, while wooden figures and masks from the Dogon, Fang, Baule, Kongo and many other peoples balance abstraction and naturalism in forms of striking clarity. In the early twentieth century they transformed the course of European modern art.",
    hallmarks: [
      "Sculpture made for ritual use",
      "Bold simplification of form",
      "Masks performed in masquerade",
      "Royal casting in brass and bronze"
    ],
    wiki: "https://en.wikipedia.org/wiki/African_art"
  },
  {
    id: "indigenous-americas",
    name: "Indigenous Arts of the Americas",
    start: -1500,
    end: 1950,
    region: "The Americas",
    summary: "Long before European contact, the peoples of Mesoamerica and the Andes built cities, calendars and an art of great ambition: Olmec jade, Maya courtly carving and painted vessels, fierce Aztec stone deities, Moche portrait vessels, Nasca polychrome pottery and Andean gold worked as a sign of divine power. Across North America, Native nations carried these traditions of making into the modern era, in Pueblo pottery, Northwest Coast carving, quillwork, beadwork and painted hides. Much of this art served ritual, rulership and the bond between people, ancestors and land.",
    hallmarks: [
      "Ceramic effigy and portrait vessels",
      "Gold, jade and shell as sacred materials",
      "Animal and ancestral beings",
      "Pattern carrying identity and clan"
    ],
    wiki: "https://en.wikipedia.org/wiki/Visual_arts_of_the_Indigenous_peoples_of_the_Americas"
  },
  {
    id: "arts-of-oceania",
    name: "Arts of Oceania",
    start: 1700,
    end: 1950,
    region: "Pacific Islands",
    summary: "The islands of the Pacific, from New Guinea to Hawai'i and New Zealand, produced some of the most inventive sculpture anywhere. Carved ancestor figures, canoe prows, shields and ceremonial boards embody genealogy and spiritual power, built from wood, shell, fibre and pigment. Much of it was made for initiation, exchange and ceremony, and some objects were meant to be renewed or even left to decay once their work was done.",
    hallmarks: [
      "Ancestor figures and genealogy",
      "Wood combined with shell and fibre",
      "Bold, rhythmic surface pattern",
      "Objects for ceremony and exchange"
    ],
    wiki: "https://en.wikipedia.org/wiki/Oceanian_art"
  },
  {
    id: "prehistoric-art",
    name: "Prehistoric Art",
    start: -40000,
    end: -500,
    region: "Europe",
    summary: "The oldest surviving art was made by Ice Age hunter-gatherers: figurines carved from mammoth ivory, limestone and bone, and paintings deep inside caves. Small female figures such as the Venus of Willendorf exaggerate the body in ways still debated, as fertility charms, self-portraits or symbols. Much later, Bronze Age metalworkers cast ritual objects that tie art to the sun, the seasons and the gods.",
    hallmarks: [
      "Portable figures in ivory, stone and bone",
      "Exaggerated, symbolic bodies",
      "Animals and hybrids of human and beast",
      "Ritual objects tied to the sun and the seasons",
    ],
    wiki: "https://en.wikipedia.org/wiki/Prehistoric_art",
  },
  {
    id: "ancient-near-east",
    name: "Ancient Near East",
    start: -3500,
    end: -330,
    region: "Mesopotamia & Persia",
    summary: "Between the Tigris and Euphrates, the first cities produced the first monumental art: temple offerings, royal steles and palace walls. Sumerian, Akkadian, Babylonian and Assyrian artists told stories of kings and gods in stacked registers of relief, and glazed brick turned city gates into processions of dragons and lions. Their images of power, war and the hunt shaped the art of every empire that followed.",
    hallmarks: [
      "Narrative relief in horizontal registers",
      "Kingship, war and the royal hunt",
      "Glazed brick and inlaid shell and lapis",
      "Text and image combined on steles",
    ],
    wiki: "https://en.wikipedia.org/wiki/Art_of_Mesopotamia",
  },
  {
    id: "russian-realism",
    name: "Russian Realism",
    start: 1830,
    end: 1900,
    region: "Russia",
    summary: "In 1863 fourteen students walked out of the St Petersburg Academy rather than paint a set mythological subject. Their successors, the Peredvizhniki or Wanderers, took travelling exhibitions across Russia and painted peasants, history, landscape and the conscience of the nation. Repin, Kramskoi and Savitsky joined sharp observation to moral seriousness, while painters like Aivazovsky and Bryullov carried the Romantic and academic traditions alongside them.",
    hallmarks: [
      "Travelling exhibitions for a wide public",
      "Peasant life and social critique",
      "Russian history painted as drama",
      "The vast Russian landscape",
    ],
    wiki: "https://en.wikipedia.org/wiki/Peredvizhniki",
  },
  {
    id: "aestheticism",
    name: "The Aesthetic Movement",
    start: 1860,
    end: 1900,
    region: "Britain",
    summary: "\"Art for art's sake\": in Victorian Britain a circle of painters and designers argued that a picture needed no moral or story, only beauty. Whistler titled his paintings like pieces of music, as arrangements and symphonies, while Leighton and Alma-Tadema lavished technique on languid classical figures, marble and flowers. The movement reached into furniture, fashion and interiors, and its ideals passed on to Symbolism and design.",
    hallmarks: [
      "Beauty as the only purpose",
      "Musical titles and harmonies of colour",
      "Languid classical figures",
      "Japanese prints and decorative arts as models",
    ],
    wiki: "https://en.wikipedia.org/wiki/Aestheticism",
  },
  {
    id: "american-regionalism",
    name: "American Regionalism",
    start: 1925,
    end: 1945,
    region: "United States",
    summary: "In the years of the Depression, Grant Wood, Thomas Hart Benton and John Steuart Curry turned away from European modernism to paint the rural Midwest. Their crisp, stylised scenes of farms and small towns celebrated, and sometimes gently satirised, American life. Once dismissed as provincial, Regionalism produced some of the most recognised images in American art.",
    hallmarks: [
      "Rural and small-town subjects",
      "Crisp, simplified forms",
      "Rejection of European abstraction",
      "Affection mixed with irony",
    ],
    wiki: "https://en.wikipedia.org/wiki/Regionalism_(art)",
  },
];
