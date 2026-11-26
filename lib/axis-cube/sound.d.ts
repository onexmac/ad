/** The Cubes' sounds: see sound.js for what each one is and when it is heard. */
export interface AxisSound {
  /** Start, or wake, the page's audio. Only does anything from inside a touch. */
  wake(): void;
  /** The loading is over: heard only if the browser already lets the page make sound. */
  ready(): void;
  select(): void;
  pick(puzzle?: string): void;
  drop(): void;
  land(): void;
  turn(face: number, turned?: boolean, puzzle?: string, closer?: boolean): void;
  step(): void;
  flip(): void;
  tick(): void;
  arm(): void;
  swish(): void;
  /** Something with weight sent flying: a long, falling swoosh. */
  swoosh(): void;
  /** It lands: bo-lup, with a soft thump. */
  bolup(): void;
  /** The time merging into the screen: a quick 8-bit run. */
  merge(after?: number): void;
  /** A puzzle solved by hand: bi-li-li-li-lo-lu-li-lup, in the puzzle's voice. */
  cheer(puzzle?: string): void;
  wind(speed: number): void;
  charge(k: number): void;
  wobble(on: boolean): void;
  quiet(): void;
  dispose(): void;
}
export function makeSound(given?: BaseAudioContext): AxisSound;
