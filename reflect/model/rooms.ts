// Changing this string to the next in the sequence a-z,aa-zz,aaa-zzz,..
// will force a new orchestrator and rooms.  This can be useful if we make
// breaking schema changes or simply want rooms with less garbage built up.
const ROOMS_VERSION = "d";

export enum RoomTypes {
  PlayOrchestrator = "playorch",
  ShareOrchestrator = "shareorch",
  Play = "play",
  Share = "share",
}

export function getPlayOrchestratorRoomID() {
  return RoomTypes.PlayOrchestrator + "-" + ROOMS_VERSION;
}

export function getShareOrchestratorRoomID(encodedCells: string) {
  return RoomTypes.ShareOrchestrator + "-" + ROOMS_VERSION + "-" + encodedCells;
}

export function getPlayRoomID(index: number) {
  return RoomTypes.Play + "-" + ROOMS_VERSION + "-" + index;
}

export function getShareRoomID(encodedCells: string, index: number) {
  return RoomTypes.Share + "-" + ROOMS_VERSION + "-" + index;
}

export function getRoomType(roomID: string): RoomTypes | undefined {
  const firstDashIndex = roomID.indexOf("-");
  if (firstDashIndex < 0) {
    return undefined;
  }
  const type = roomID.substring(0, firstDashIndex);
  switch (type) {
    case RoomTypes.PlayOrchestrator:
    case RoomTypes.ShareOrchestrator:
    case RoomTypes.Play:
    case RoomTypes.Share:
      return type;
    default:
      return undefined;
  }
}
