// The EX30's six factory colours, as the viewer paints them. The values are matched by eye to photographs of each
// colour in daylight, not taken from Volvo: close enough to judge a livery against, not to order touch-up paint by.
// The roof, the pillars and the mirror caps stay gloss black whatever the body is, as on the car.
export type Paint = { id: string; name: string; color: string; metal: number; rough: number };

export const PAINTS: Paint[] = [
  { id: "onyx", name: "Onyx Black", color: "#0a0b0d", metal: 0.55, rough: 0.32 },
  { id: "cloud", name: "Cloud Blue", color: "#aebdc8", metal: 0.15, rough: 0.4 },
  { id: "moss", name: "Moss Yellow", color: "#bdb94a", metal: 0.2, rough: 0.38 },
  { id: "vapour", name: "Vapour Grey", color: "#a8a9a5", metal: 0.35, rough: 0.38 },
  { id: "crystal", name: "Crystal White", color: "#e7e8e4", metal: 0.1, rough: 0.34 },
  { id: "sand", name: "Sand Dune", color: "#b3a388", metal: 0.45, rough: 0.34 },
];

/** Marcos's car. */
export const DEFAULT_PAINT = "onyx";
