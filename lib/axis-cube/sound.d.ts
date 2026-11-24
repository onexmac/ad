/** The Cubes' sounds: see sound.js for what each one is and when it is heard. */
export interface AxisSound {
  /** Start, or wake, the page's audio. Only does anything from inside a touch. */
  wake(): void;
  select(): void;
  pick(): void;
  drop(): void;
  land(): void;
  turn(key: number, turned?: boolean): void;
  step(): void;
  flip(): void;
  tick(): void;
  arm(): void;
  swish(): void;
  wind(speed: number): void;
  charge(k: number): void;
  wobble(on: boolean): void;
  quiet(): void;
  dispose(): void;
}
export function makeSound(given?: BaseAudioContext): AxisSound;
