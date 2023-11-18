import { generate } from "@rocicorp/rails";
import type { ReadTransaction, WriteTransaction } from "@rocicorp/reflect";
import * as v from "@badrap/valita";
import { getPublicPlayRoomID, getShareRoomID } from "./rooms";

const MAX_CLIENTS_PER_PLAY_ROOM = 8;
const MAX_CLIENTS_PER_SHARE_ROOM = 50;
const CLIENT_ROOM_ASSIGNMENT_GC_THRESHOLD_MS = 60_000;
const CLIENT_ROOM_ASSIGNMENT_GC_INTERVAL_MS = 10_000;

const roomModelSchema = v.object({
  id: v.string(),
  clientCount: v.number(),
});

export const clientRoomAssignmentSchema = v.object({
  id: v.string(),
  // foreign key to a roomModelSchema
  roomID: v.string(),
  aliveTimestamp: v.number(),
});

const clientRoomAssignmentMetaSchema = v.object({
  lastGCTimestamp: v.number(),
});

// Export generated interface.
export type ClientRoomAssignmentModel = v.Infer<
  typeof clientRoomAssignmentSchema
>;
type ClientRoomAssignmentMetaModel = v.Infer<
  typeof clientRoomAssignmentMetaSchema
>;

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
): Promise<ClientRoomAssignmentMetaModel | undefined> {
  const meta = await tx.get(clientRoomAssignmentMetaKey);
  if (meta === undefined) {
    return meta;
  }
  return clientRoomAssignmentMetaSchema.parse(meta);
}

async function putClientRoomAssignmentMeta(
  tx: WriteTransaction,
  meta: ClientRoomAssignmentMetaModel
) {
  await tx.set(clientRoomAssignmentMetaKey, meta);
}

async function updateRoomClientCount(
  tx: WriteTransaction,
  roomID: string,
  change: number
) {
  const room = await getRoom(tx, roomID);
  if (room !== undefined) {
    await putRoom(tx, {
      id: room.id,
      clientCount: Math.max(room.clientCount + change, 0),
    });
  }
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
    const roomCountChanges = new Map();
    for (const assignment of assignments) {
      if (
        now - assignment.aliveTimestamp >
        CLIENT_ROOM_ASSIGNMENT_GC_THRESHOLD_MS
      ) {
        toDelete.push(assignment);
        roomCountChanges.set(
          assignment.roomID,
          (roomCountChanges.get(assignment.roomID) ?? 0) - 1
        );
      }
    }
    await Promise.all(
      toDelete.map((assignment) =>
        deleteClientRoomAssignment(tx, assignment.id)
      )
    );
    await Promise.all(
      [...roomCountChanges.entries()].map(async ([roomID, change]) => {
        await updateRoomClientCount(tx, roomID, change);
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
  const tryToAssignRoom = async (roomID: string) => {
    const room = await getRoom(tx, roomID);
    const clientCount = room?.clientCount ?? 0;
    const maxClients =
      args.type === "share"
        ? MAX_CLIENTS_PER_SHARE_ROOM
        : MAX_CLIENTS_PER_PLAY_ROOM;
    if (clientCount < maxClients) {
      if (room === undefined) {
        await putRoom(tx, {
          id: roomID,
          clientCount: 1,
        });
      } else {
        await updateRoomClientCount(tx, roomID, 1);
      }
      await putClientRoomAssignment(tx, {
        id: tx.clientID,
        roomID,
        aliveTimestamp: now,
      });
      roomAssigned = true;
    }
  };

  if (args.type === "play" && args.preferredRoomID) {
    await tryToAssignRoom(args.preferredRoomID);
  }
  for (let roomIndex = 0; !roomAssigned; roomIndex++) {
    const roomID =
      args.type === "share"
        ? getShareRoomID(args.encodedCells, roomIndex)
        : getPublicPlayRoomID(roomIndex);
    const room = await getRoom(tx, roomID);
    const clientCount = room?.clientCount ?? 0;
    const maxClients =
      args.type === "share"
        ? MAX_CLIENTS_PER_SHARE_ROOM
        : MAX_CLIENTS_PER_PLAY_ROOM;
    if (clientCount < maxClients) {
      if (room === undefined) {
        await putRoom(tx, {
          id: roomID,
          clientCount: 1,
        });
      } else {
        await updateRoomClientCount(tx, roomID, 1);
      }
      await putClientRoomAssignment(tx, {
        id: tx.clientID,
        roomID,
        aliveTimestamp: now,
      });
      roomAssigned = true;
    }
  }
}

async function unload(tx: WriteTransaction) {
  if (tx.location !== "server") {
    return;
  }
  const assignment = await getClientRoomAssignment(tx, tx.clientID);
  if (assignment !== undefined) {
    await Promise.all([
      await updateRoomClientCount(tx, assignment.roomID, -1),
      await deleteClientRoomAssignment(tx, assignment.id),
    ]);
  }
}

export const mutators = {
  alive,
  unload,
};
