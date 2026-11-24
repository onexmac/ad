/*
 * Where Puncheo scrolls. The app (B) lives in a vvs frame (components/vvv): the
 * document never moves and the frame scrolls inside itself. The legacy layouts
 * still scroll the window. Everything that reads or moves the scroll goes
 * through here, so it works in both.
 */

let frame: HTMLElement | null = null;

/** The vvv frame registers itself on mount (and clears itself on unmount). */
export function setScrollFrame(el: HTMLElement | null) {
  frame = el;
}

export const inFrame = () => frame !== null;

/** What scrolls: the frame, or the window. For scroll and scrollend listeners. */
export const scrollTarget = (): HTMLElement | Window => frame ?? window;

export const scrollTop = () => (frame ? frame.scrollTop : window.scrollY);

/** How far it can scroll. */
export const scrollMax = () =>
  frame ? Math.max(0, frame.scrollHeight - frame.clientHeight) : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/** The scrolling area's top edge and height on the screen. */
export const viewTop = () => (frame ? frame.getBoundingClientRect().top : 0);
export const viewHeight = () => (frame ? frame.clientHeight : window.innerHeight);

export const scrollToY = (top: number, behavior: ScrollBehavior = "instant") =>
  (frame ?? window).scrollTo({ top: Math.max(0, Math.min(scrollMax(), top)), behavior });

/**
 * An element's place in the scrolled content, from the layout (offsets), not
 * the painted box: a row still rising into view carries a passing transform
 * that must not count.
 */
export function layoutY(el: HTMLElement) {
  let y = 0;
  for (let n: HTMLElement | null = el; n && n !== frame; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}

/** Where an element sits on the screen, by the layout. */
export const screenY = (el: HTMLElement) => layoutY(el) - scrollTop() + viewTop();
