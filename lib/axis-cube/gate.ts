// The screens before the room. On a phone, in a browser, the first time: the install screen, the cube of the
// home-screen icon, how to put the app on the home screen, and a button to go on. On an iPhone or iPad every other
// time, from the home screen too: the welcome, the loading cube already turning, the app's name and Start. The
// room is built behind either; the loader is lifted once it is gone, so after the tap the bar runs out quickly and
// the room comes in.
//
// Why the welcome: an iPhone lets a page make sound only after a touch, so without one the notes at the end of
// loading could not be heard. The tap on Start (or on Listo) is that touch. Android lets an installed app play
// without one, and its install screen's button is the touch in a browser, so it has no welcome.
//
// What a browser allows:
//   iOS has no way for a page to ask. The page can only say how (Share, then Add to Home Screen), and it cannot tell
//   from a browser tab whether the app is already installed: only that it is running from the home screen now.
//   Chrome on Android can ask (beforeinstallprompt, then prompt() from a tap), but it only hands that over once
//   the visitor has tapped the page and spent thirty seconds on it, so not on a first visit. Until then the screen
//   says how, as on iOS; if the browser does hand it over while the screen is up, the button becomes "Instalar"
//   and opens the browser's own dialog.
// Once past the install screen, in whichever way, it does not come back in that browser, and from the home screen
// it never shows; the welcome then takes its place on iOS.
//
// Whether to show it is decided by GATE_SCRIPT, which the layout puts in the page as an inline script: it runs as
// the page is parsed, before the first paint, so the screen is there from the start and the loader never shows
// first. It marks the decision as classes on <html>, and the stylesheet does the rest:
//   axis-ask           a screen is up (and the loader under it is held still)
//   axis-ask-hello     it is the welcome
//   axis-ask-ios       with the steps for iOS
//   axis-ask-android   with the steps for Android
//   axis-ask-native    the browser can ask: no steps, the button installs
//   axis-ask-out       fading out

type InstallPrompt = Event & { prompt: () => Promise<unknown> | void; userChoice?: Promise<unknown> };
declare global {
  interface Window {
    __axisInstall?: InstallPrompt | null;
    /** the page's audio, started by the inline script inside the tap on the button (lib/axis-cube/sound.js takes it up) */
    __axisAudio?: AudioContext;
    /** performance.now() when the screen's button was pressed */
    __axisGo?: number;
    /** the inline script's own way out, so that what is done on the way out is written once */
    __axisLeave?: () => void;
  }
}

const KEY = "axis-gate";
const UP = "axis-ask";
const ALL = [UP, "axis-ask-hello", "axis-ask-ios", "axis-ask-android", "axis-ask-native", "axis-ask-out"];
/** Sent on window: the button was pressed (the screen is going), and the screen has gone. */
export const GATE_START = "axis:start";
export const GATE_GONE = "axis:gone";

// Written for any browser that can open the page: no syntax newer than ES5. The browser's own install banner is
// always declined (it would sit over the rings); what it offers is kept for the button. In-app browsers (the ones
// inside social apps) cannot add to the home screen: they get no install screen, and on iOS the welcome.
//
// The button is answered here too, and not by the app: this script is in the page from the first paint, while the
// app's scripts are still arriving, and a tap must never wait for them. It presses in on touch and springs back on
// release (the classes press and bounce; the stylesheet has the motion, which runs off the main thread); the tap
// itself starts the page's audio, which an iPhone allows only inside a tap, asks Chrome to install if it has offered
// to, and takes the screen away. The app hears of it through the two events above.
export const GATE_SCRIPT = `(function(){try{var w=window,d=document.documentElement,n=navigator,u=n.userAgent||"";
w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();w.__axisInstall=e;if(d.classList.contains("${UP}")&&!d.classList.contains("axis-ask-hello"))d.classList.add("axis-ask-native")});
var ios=/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&n.maxTouchPoints>1),android=/Android/.test(u);
var installed=n.standalone===true||w.matchMedia("(display-mode: standalone)").matches||w.matchMedia("(display-mode: fullscreen)").matches;
var seen=false;try{seen=w.localStorage.getItem("${KEY}")==="1"}catch(e){}
var inapp=/FBAN|FBAV|Instagram|Line\\/|MicroMessenger|TikTok|musical_ly|LinkedInApp|Snapchat/.test(u);
if(!installed&&!seen&&!inapp&&(ios||android))d.classList.add("${UP}",ios?"axis-ask-ios":"axis-ask-android");
else if(ios)d.classList.add("${UP}","axis-ask-hello");
var ALL=${JSON.stringify(ALL)},gone=false;
function tell(k){try{w.dispatchEvent(new Event(k))}catch(e){}}
function btn(e){var t=e.target;return t&&t.closest?t.closest(".axis-gate .ok"):null}
function release(){var b=d.querySelector(".axis-gate .ok.press");if(!b)return;b.classList.remove("press");void b.offsetWidth;b.classList.add("bounce")}
function sound(){var c0=w.__axisAudio;if(c0){try{c0.resume()}catch(e){}return}var A=w.AudioContext||w.webkitAudioContext;if(!A)return;
try{if(n.audioSession)n.audioSession.type="ambient"}catch(e){}
try{var c=new A({latencyHint:"interactive"}),s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);if(c.resume)c.resume();w.__axisAudio=c}catch(e){}}
function leave(){if(gone||!d.classList.contains("${UP}"))return;gone=true;
if(!d.classList.contains("axis-ask-hello")){try{w.localStorage.setItem("${KEY}","1")}catch(e){}}
d.classList.add("axis-ask-out");setTimeout(function(){for(var i=0;i<ALL.length;i++)d.classList.remove(ALL[i]);tell("${GATE_GONE}")},220)}
function go(){if(gone||w.__axisGo)return;w.__axisGo=w.performance?performance.now():1;sound();tell("${GATE_START}");
var ask=w.__axisInstall;if(ask&&d.classList.contains("axis-ask-native")){w.__axisInstall=null;try{Promise.resolve(ask.prompt()).then(function(){return ask.userChoice}).then(leave,leave)}catch(e){leave()}}else leave()}
w.__axisLeave=leave;
d.addEventListener("pointerdown",function(e){var b=btn(e);if(!b)return;b.classList.remove("bounce");b.classList.add("press")},true);
d.addEventListener("pointerup",release,true);d.addEventListener("pointercancel",release,true);
d.addEventListener("click",function(e){if(!btn(e))return;e.preventDefault();release();go()},true);
}catch(e){}})();`;

/** Is a screen up (the install screen or the welcome)? While it is, the room is built but the loader stays. */
export function gateUp() {
  return document.documentElement.classList.contains(UP);
}

/** For the app: called once when the screen's button is pressed, and once when the screen has gone. */
export function onGate(start: () => void, gone?: () => void) {
  window.addEventListener(GATE_START, start);
  if (gone) window.addEventListener(GATE_GONE, gone);
  return () => {
    window.removeEventListener(GATE_START, start);
    if (gone) window.removeEventListener(GATE_GONE, gone);
  };
}

/** Take the screen away without a tap (the app was installed from the browser's own menu while it was up). */
export function leaveGate() {
  window.__axisLeave?.();
}
