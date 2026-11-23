// The loading screen's markup, in one place: the app's page renders it on the server, and the artifact build and the
// loader preview write it into their pages. It is only markup and CSS (app/(axis-cube)/kit/axis-cube/globals.css), so
// it is on screen and moving before any script arrives.
//
// A two-by-two cube, flat: each face is four tiles, white or black with a white edge, and it flips a quarter turn at
// a time, for ever. Under it, the bar.
const FACES = [["top", "w"], ["bottom", "k"], ["front", "k"], ["back", "w"], ["right", "w"], ["left", "k"]];

export const LOADER_HTML =
  '<span class="cube" aria-hidden="true">' +
  FACES.map(([side, tone]) => `<span class="face ${side} ${tone}"><i></i><i></i><i></i><i></i></span>`).join("") +
  '</span><span class="bar"><span class="track"><i></i></span></span>';
