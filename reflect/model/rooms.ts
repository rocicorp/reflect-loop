// Changing this string to the next in the sequence a-z,aa-zz,aaa-zzz,..
// will force a new orchestrator and rooms.  This can be useful if we make
// breaking schema changes or simply want rooms with less garbage built up.
const ROOMS_VERSION = "d";
const SEPARATOR = "_";

export enum RoomType {
  PlayOrchestrator = "playorch",
  ShareOrchestrator = "shareorch",
  Play = "play",
  Share = "share",
}

function makeID(...parts: string[]): string {
  return [...parts, ROOMS_VERSION].join(SEPARATOR);
}

export function getPlayOrchestratorRoomID() {
  return makeID(RoomType.PlayOrchestrator);
}

export function getShareOrchestratorRoomID(encodedCells: string) {
  return makeID(RoomType.ShareOrchestrator, encodedCells);
}

export function getPlayRoomID(index: number) {
  return makeID(RoomType.Play, `i${index}`);
}

export function getShareRoomID(
  shareOrchestratorRoomID: string,
  index: number
): string | undefined {
  const roomType = getRoomTypeForRoomID(shareOrchestratorRoomID);
  if (roomType !== RoomType.ShareOrchestrator) {
    return undefined;
  }
  const lastDashIndex = shareOrchestratorRoomID.lastIndexOf("-");
  if (lastDashIndex < 0) {
    return undefined;
  }
  const encodedCells = shareOrchestratorRoomID.substring(
    lastDashIndex,
    shareOrchestratorRoomID.length
  );
  return makeID(RoomType.Share, encodedCells, `i${index}`);
}

export function getRoomTypeForRoomID(roomID: string): RoomType | undefined {
  const firstDashIndex = roomID.indexOf(SEPARATOR);
  if (firstDashIndex < 0) {
    return undefined;
  }
  const type = roomID.substring(0, firstDashIndex);
  switch (type) {
    case RoomType.PlayOrchestrator:
    case RoomType.ShareOrchestrator:
    case RoomType.Play:
    case RoomType.Share:
      return type;
    default:
      return undefined;
  }
}
