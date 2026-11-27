import { readChangelog } from "@/lib/changelog";

/** PS2 Fiori's folder, and the version it is at, read from its changelog when the site is built. */
export const FIORI_DIR = "app/(ps2-fiori)/kit/ps2-fiori";
export const FIORI_VERSION = readChangelog(FIORI_DIR).version;
