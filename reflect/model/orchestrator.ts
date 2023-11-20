import { generate } from "@rocicorp/rails";
import type { ReadTransaction, WriteTransaction } from "@rocicorp/reflect";
import * as v from "@badrap/valita";
import { getPublicPlayRoomID, getShareRoomID } from "./rooms";
import { getUnusedColorID, randomColorID } from "./colors";

type RoomType = "play" | "share";

const MAX_CLIENTS_PER_PLAY_ROOM = 8;
const MAX_CLIENTS_PER_SHARE_ROOM = 50;
const CLIENT_ROOM_ASSIGNMENT_GC_THRESHOLD_MS = 60_000;
const CLIENT_ROOM_ASSIGNMENT_GC_INTERVAL_MS = 10_000;

const roomModelSchema = v.object({
  id: v.string(),
  clientColors: v.array(v.string()),
});

export const clientRoomAssignmentSchema = v.object({
  id: v.string(),
  // foreign key to a roomModelSchema
  roomID: v.string(),
  aliveTimestamp: v.number(),
  color: v.string(),
});

const clientRoomAssignmentMetaSchema = v.object({
  lastGCTimestamp: v.number(),
});

// Export generated interface.
export type ClientRoomAssignment = v.Infer<typeof clientRoomAssignmentSchema>;
type ClientRoomAssignmentMeta = v.Infer<typeof clientRoomAssignmentMetaSchema>;

const { get: getRoom, put: putRoom } = generate(
  "room",
  roomModelSchema.parse.bind(roomModelSchema)
);

const {
  get: getClientRoomAssignmentInternal,
  put: putClientRoomAssignment,
  update: updateClientRoomAssignment,
  delete: deleteClientRoomAssignment,
  list: listClientRoomAssignments,
} = generate(
  "clientToRoom",
  clientRoomAssignmentSchema.parse.bind(clientRoomAssignmentSchema)
);

export const getClientRoomAssignment = getClientRoomAssignmentInternal;

const clientRoomAssignmentMetaKey = "clientToRoomMeta";
async function getClientRoomAssignmentMeta(
  tx: ReadTransaction
): Promise<ClientRoomAssignmentMeta | undefined> {
  const meta = await tx.get(clientRoomAssignmentMetaKey);
  if (meta === undefined) {
    return meta;
  }
  return clientRoomAssignmentMetaSchema.parse(meta);
}

async function putClientRoomAssignmentMeta(
  tx: WriteTransaction,
  meta: ClientRoomAssignmentMeta
) {
  await tx.set(clientRoomAssignmentMetaKey, meta);
}

async function tryToAddClientToRoom(
  tx: WriteTransaction,
  roomID: string,
  roomType: RoomType,
  now: number
) {
  const room = (await getRoom(tx, roomID)) ?? {
    id: roomID,
    clientColors: [],
  };
  const max =
    roomType === "play"
      ? MAX_CLIENTS_PER_PLAY_ROOM
      : MAX_CLIENTS_PER_SHARE_ROOM;
  if (room.clientColors.length >= max) {
    return false;
  }
  const color = getUnusedColorID(room.clientColors) ?? randomColorID();
  await putRoom(tx, {
    id: roomID,
    clientColors: [...room.clientColors, color],
  });
  await putClientRoomAssignment(tx, {
    id: tx.clientID,
    roomID,
    aliveTimestamp: now,
    color,
  });
  return true;
}

async function removeClientsFromRoom(
  tx: WriteTransaction,
  roomID: string,
  clientColors: string[]
) {
  const room = await getRoom(tx, roomID);
  if (!room) {
    return;
  }
  const updatedClientColors = [...room.clientColors];
  for (const color of clientColors) {
    const index = updatedClientColors.indexOf(color);
    if (index >= 0) {
      updatedClientColors.splice(index, 1);
    }
  }
  await putRoom(tx, {
    id: roomID,
    clientColors: updatedClientColors,
  });
}

async function alive(
  tx: WriteTransaction,
  args:
    | { type: "play"; preferredRoomID?: string }
    | { type: "share"; encodedCells: string }
) {
  if (tx.location !== "server") {
    return;
  }

  const now = Date.now();
  const clientRoomAssignmentMeta = await getClientRoomAssignmentMeta(tx);
  if (
    clientRoomAssignmentMeta === undefined ||
    now - clientRoomAssignmentMeta.lastGCTimestamp >
      CLIENT_ROOM_ASSIGNMENT_GC_INTERVAL_MS
  ) {
    await putClientRoomAssignmentMeta(tx, { lastGCTimestamp: now });
    // GC room assignments
    const assignments = await listClientRoomAssignments(tx);
    const toDelete = [];
    const roomColorChanges = new Map();
    for (const assignment of assignments) {
      if (
        now - assignment.aliveTimestamp >
        CLIENT_ROOM_ASSIGNMENT_GC_THRESHOLD_MS
      ) {
        toDelete.push(assignment);
        roomColorChanges.set(assignment.roomID, [
          ...(roomColorChanges.get(assignment.roomID) ?? []),
          assignment.color,
        ]);
      }
    }
    await Promise.all(
      toDelete.map((assignment) =>
        deleteClientRoomAssignment(tx, assignment.id)
      )
    );
    await Promise.all(
      [...roomColorChanges.entries()].map(async ([roomID, change]) => {
        await removeClientsFromRoom(tx, roomID, change);
      })
    );
  }
  const clientRoomAssignment = await getClientRoomAssignment(tx, tx.clientID);
  if (clientRoomAssignment !== undefined) {
    await updateClientRoomAssignment(tx, {
      id: clientRoomAssignment.id,
      aliveTimestamp: now,
    });
    return;
  }
  let roomAssigned = false;
  if (args.type === "play" && args.preferredRoomID) {
    roomAssigned = await tryToAddClientToRoom(
      tx,
      args.preferredRoomID,
      args.type,
      now
    );
  }
  for (let roomIndex = 0; !roomAssigned; roomIndex++) {
    const roomID =
      args.type === "share"
        ? getShareRoomID(args.encodedCells, roomIndex)
        : getPublicPlayRoomID(roomIndex);
    roomAssigned = await tryToAddClientToRoom(tx, roomID, args.type, now);
  }
}

async function unload(tx: WriteTransaction) {
  if (tx.location !== "server") {
    return;
  }
  const assignment = await getClientRoomAssignment(tx, tx.clientID);
  if (assignment !== undefined) {
    await Promise.all([
      await removeClientsFromRoom(tx, assignment.roomID, [assignment.color]),
      await deleteClientRoomAssignment(tx, assignment.id),
    ]);
  }
}

export const mutators = {
  alive,
  unload,
};
