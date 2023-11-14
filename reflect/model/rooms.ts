// Changing this string to the next in the sequence a-z,aa-zz,aaa-zzz,..
// will force a new orchestrator and rooms.  This can be useful if we make
// breaking schema changes or simply want rooms with less garbage built up.
const ROOMS_VERSION = "d";
const SEPARATOR = "_";

function makeID(...parts: string[]): string {
  return [...parts, ROOMS_VERSION].join(SEPARATOR);
}

export function getOrchstratorRoomID(scope: string) {
  return makeID("orch", scope);
}

export function getPlayRoomID(index: number) {
  return makeID("play", `i${index}`);
}

export function getShareRoomID(scope: string, index: number): string {
  return makeID("share", scope, `i${index}`);
}
