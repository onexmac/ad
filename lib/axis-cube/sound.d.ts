/** The Cubes' sounds: see sound.js for what each one is and when it is heard. */
export interface AxisSound {
  /** Start, or wake, the page's audio. Only does anything from inside a touch. */
  wake(): void;
  /** The loading is over: heard only if the browser already lets the page make sound. */
  ready(waitForTouch?: boolean): void;
  /** Whether the audio's clock moves: a sound made now is heard now. */
  ticking(): boolean;
  select(): void;
  pick(puzzle?: string): void;
  drop(): void;
  land(): void;
  turn(face: number, turned?: boolean, puzzle?: string, closer?: boolean): void;
  /** A locked puzzle is touched: it says no. */
  refuse(): void;
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
  /** The picker's music, 0..1, every frame: how much of it should be heard. */
  music(k: number, chip?: boolean): void;
  /** For a test with its own (offline) context: the music's first `secs` seconds, scheduled at once. */
  musicFor(secs: number, skin?: 'lofi' | 'chip'): void;
  /** Cubed, the victory song: on after a solve's cheer (delay in seconds), off once the initials are kept. */
  victory(on: boolean, delay?: number): void;
  /** Cubed as the picker's song (true once the Ghost Cube has been finished by hand). */
  lobbyCubed(on: boolean): void;
  /** For a test with its own (offline) context: Cubed's first `secs` seconds. */
  cubedFor(secs: number): void;
  /** For a test: how much of the music is wanted and whether its loop is running. */
  musicNow(): { k: number; playing: boolean; step: number; round: number; skin: string; victory: boolean; vstep: number; cubed: boolean };
  /** Every sound off (true), or back on. */
  mute(on: boolean): void;
  isMuted(): boolean;
  wobble(on: boolean): void;
  quiet(): void;
  dispose(): void;
}
export function makeSound(given?: BaseAudioContext): AxisSound;
