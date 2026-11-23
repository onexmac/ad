import { mountAxisCube } from "../../../lib/axis-cube/scene.js";

// The look comes from the page (set by the build) or from the address: axis-cube.html#b
const look = (location.hash || "").replace("#", "") || window.AXIS_LOOK || "a";
mountAxisCube(document.getElementById("root"), { texBase: "tex/", look });
