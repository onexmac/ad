import { readChangelog } from "@/lib/changelog";

/** MAQ02's folder, and the version it is at, read from its changelog when the site is built. */
export const MAQ_DIR = "app/(maq02)/kit/maq02";
export const MAQ_VERSION = readChangelog(MAQ_DIR).version;
