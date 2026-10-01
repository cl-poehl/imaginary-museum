// Controlled vocabulary the taste model learns over. Every artwork is tagged
// with a handful of these; movement, artist and century are added on top.

export type TraitGroup =
  | "subject"
  | "mood"
  | "light"
  | "temperature"
  | "intensity"
  | "ornament"
  | "handling"
  | "form"
  | "composition"
  | "meaning";

export type Trait = {
  id: string;
  group: TraitGroup;
  label: string;
};

export const TRAIT_GROUPS: Record<TraitGroup, string> = {
  subject: "Subject",
  mood: "Mood",
  light: "Light",
  temperature: "Colour temperature",
  intensity: "Colour intensity",
  ornament: "Ornament",
  handling: "Handling",
  form: "Form",
  composition: "Composition",
  meaning: "Meaning",
};

const list: Trait[] = [
  { id: "portrait", group: "subject", label: "portraiture" },
  { id: "landscape", group: "subject", label: "landscape" },
  { id: "sacred", group: "subject", label: "sacred subjects" },
  { id: "myth", group: "subject", label: "myth and legend" },
  { id: "history", group: "subject", label: "history and politics" },
  { id: "everyday", group: "subject", label: "scenes of everyday life" },
  { id: "still-life", group: "subject", label: "still life" },
  { id: "nude", group: "subject", label: "the nude" },
  { id: "water", group: "subject", label: "sea and water" },
  { id: "nonfigurative", group: "subject", label: "pure abstraction" },

  { id: "serene", group: "mood", label: "serenity" },
  { id: "dramatic", group: "mood", label: "high drama" },
  { id: "melancholy", group: "mood", label: "melancholy" },
  { id: "joyful", group: "mood", label: "joy and leisure" },
  { id: "uncanny", group: "mood", label: "the uncanny" },
  { id: "intimate", group: "mood", label: "intimacy" },
  { id: "sensual", group: "mood", label: "sensuality" },
  { id: "spiritual", group: "mood", label: "the spiritual" },

  { id: "shadow", group: "light", label: "deep shadow" },
  { id: "luminous", group: "light", label: "open, luminous light" },

  { id: "warm", group: "temperature", label: "warm colour" },
  { id: "cool", group: "temperature", label: "cool colour" },
  { id: "vivid", group: "intensity", label: "saturated colour" },
  { id: "muted", group: "intensity", label: "restrained colour" },
  { id: "gold", group: "ornament", label: "gold and ornament" },

  { id: "precise", group: "handling", label: "meticulous finish" },
  { id: "painterly", group: "handling", label: "visible brushwork" },
  { id: "flat", group: "handling", label: "flat colour and line" },

  { id: "naturalistic", group: "form", label: "naturalism" },
  { id: "stylized", group: "form", label: "stylization" },
  { id: "crowded", group: "composition", label: "crowded compositions" },
  { id: "solitary", group: "composition", label: "a single, focused figure" },
  { id: "symbolic", group: "meaning", label: "hidden symbolism" },
];

export const TRAITS: Record<string, Trait> = Object.fromEntries(list.map((t) => [t.id, t]));
