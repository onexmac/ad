import { mountAxisCube } from "../../../lib/axis-cube/scene.js";

// The look comes from the page (set by the build) or from the address: axis-cube.html#b.
// The picker in the scene changes it in place: the scene is taken down and put up again in the new look.
const root = document.getElementById("root");
let dispose = null;
function mount(look) {
  if (dispose) dispose();
  dispose = mountAxisCube(root, {
    texBase: "tex/",
    look,
    onLook: (k) => {
      try { history.replaceState(null, "", "#" + k); } catch (e) { /* a sandboxed page may not rewrite its address */ }
      mount(k);
    },
  });
}
mount((location.hash || "").replace("#", "") || window.AXIS_LOOK || "a");
