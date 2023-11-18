// Changing this string to the next in the sequence a-z,aa-zz,aaa-zzz,..
// will force a new orchestrator and rooms.  This can be useful if we make

import { customAlphabet } from "nanoid";

// breaking schema changes or simply want rooms with less garbage built up.
const ROOMS_VERSION = "d";
const SEPARATOR = "_";
const createRandomID = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  12
);

function makeID(...parts: string[]): string {
  return [...parts, ROOMS_VERSION].join(SEPARATOR);
}

export function getOrchstratorRoomID(scope: string) {
  return makeID("orch", scope);
}

export function getPublicPlayRoomID(index: number) {
  return makeID("play", `i${index}`);
}

export function getRandomPlayRoomID() {
  return makeID("play", `r${createRandomID()}`);
}

export function getShareRoomID(scope: string, index: number): string {
  return makeID("share", scope, `i${index}`);
}
