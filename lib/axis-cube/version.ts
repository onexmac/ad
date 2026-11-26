import { readChangelog } from "@/lib/changelog";

/** The Cubes' folder, and the version it is at, read from its changelog when the site is built. */
export const AXIS_DIR = "app/(axis-cube)/kit/axis-cube";
export const AXIS_VERSION = readChangelog(AXIS_DIR).version;
