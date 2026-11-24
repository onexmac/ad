// The install screen: on a phone, in a browser, the first thing a visitor sees is the cube of the home-screen icon,
// how to put the app on the home screen, and a button to go on. It comes before anything is loaded; the room is
// built only once the visitor has gone past it.
//
// What a browser allows:
//   iOS has no way for a page to ask. The page can only say how (Share, then Add to Home Screen), and it cannot tell
//   from a browser tab whether the app is already installed: only that it is running from the home screen now.
//   Chrome on Android can ask (beforeinstallprompt, then prompt() from a tap), but it only hands that over once
//   the visitor has tapped the page and spent thirty seconds on it, so not on a first visit. Until then the screen
//   says how, as on iOS; if the browser does hand it over while the screen is up, the button becomes "Instalar"
//   and opens the browser's own dialog.
// Once past it, in whichever way, the screen does not come back in that browser. From the home screen it never shows.
//
// Whether to show it is decided by GATE_SCRIPT, which the layout puts in the page as an inline script: it runs as
// the page is parsed, before the first paint, so the screen is there from the start and the loader never shows
// first. It marks the decision as classes on <html>, and the stylesheet does the rest:
//   axis-ask           the screen is up (and the loader under it is held still)
//   axis-ask-ios       with the steps for iOS
//   axis-ask-android   with the steps for Android
//   axis-ask-native    the browser can ask: no steps, the button installs
//   axis-ask-out       fading out

type InstallPrompt = Event & { prompt: () => Promise<unknown> | void; userChoice?: Promise<unknown> };
declare global {
  interface Window { __axisInstall?: InstallPrompt | null }
}

const KEY = "axis-gate";
const UP = "axis-ask";
const ALL = [UP, "axis-ask-ios", "axis-ask-android", "axis-ask-native", "axis-ask-out"];

// Written for any browser that can open the page: no syntax newer than ES5. The browser's own install banner is
// always declined (it would sit over the rings); what it offers is kept for the button. In-app browsers (the ones
// inside social apps) cannot add to the home screen, so they are let straight in.
export const GATE_SCRIPT = `(function(){try{var w=window,d=document.documentElement,n=navigator,u=n.userAgent||"";
w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();w.__axisInstall=e;if(d.classList.contains("${UP}"))d.classList.add("axis-ask-native")});
if(n.standalone===true||w.matchMedia("(display-mode: standalone)").matches||w.matchMedia("(display-mode: fullscreen)").matches)return;
try{if(w.localStorage.getItem("${KEY}")==="1")return}catch(e){}
if(/FBAN|FBAV|Instagram|Line\\/|MicroMessenger|TikTok|musical_ly|LinkedInApp|Snapchat/.test(u))return;
if(/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&n.maxTouchPoints>1))d.classList.add("${UP}","axis-ask-ios");
else if(/Android/.test(u))d.classList.add("${UP}","axis-ask-android");
}catch(e){}})();`;

const listeners = new Set<() => void>();

/** For useSyncExternalStore: told when the screen has gone. */
export function subscribeGate(tell: () => void) {
  listeners.add(tell);
  return () => { listeners.delete(tell); };
}

/** Is the install screen up? While it is, nothing is loaded. */
export function gateUp() {
  return document.documentElement.classList.contains(UP);
}

/** Take the screen away (it fades), remember that it was seen, and let the app load. */
export function leaveGate() {
  const html = document.documentElement;
  if (!html.classList.contains(UP) || html.classList.contains("axis-ask-out")) return;
  try { localStorage.setItem(KEY, "1"); } catch { /* no storage: it will ask again next time */ }
  html.classList.add("axis-ask-out");
  setTimeout(() => {
    html.classList.remove(...ALL);
    listeners.forEach((tell) => tell());
  }, 220);
}

/** The button: the browser's own install dialog if it has offered one, and then, or otherwise, on into the app. */
export function passGate() {
  const ask = window.__axisInstall;
  if (ask && document.documentElement.classList.contains("axis-ask-native")) {
    window.__axisInstall = null;
    Promise.resolve()
      .then(() => ask.prompt())
      .then(() => ask.userChoice)
      .catch(() => {})
      .finally(leaveGate);
    return;
  }
  leaveGate();
}
