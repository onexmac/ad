import { mountAxisCube } from "../../../lib/axis-cube/scene.js";

// The look comes from the page (set by the build) or from the address: axis-cube.html#b
const look = (location.hash || "").replace("#", "") || window.AXIS_LOOK || "a";
// Here the script is part of the page itself, so the scene waits two frames: the loader is on screen before the
// building of the room takes the main thread.
requestAnimationFrame(() => requestAnimationFrame(() => {
  mountAxisCube(document.getElementById("root"), { texBase: "tex/", look, lab: window.AXIS_LAB || "", loader: document.getElementById("loader") });
}));
