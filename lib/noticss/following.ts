"use client";

import { makeWatching } from "@/lib/updatr/watch";

/**
 * Topics followed in Noticss: a storyline's id (the same subject id carries
 * a story from one edition to the next). Kept on this device for now.
 */
export const useFollowing = makeWatching("noticss.following.v1", []);
