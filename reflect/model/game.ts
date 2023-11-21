import * as v from "@badrap/valita";
import {
  MutatorDefs,
  ReadTransaction,
  ReadonlyJSONValue,
  WriteTransaction,
} from "@rocicorp/reflect";
import { nanoid } from "nanoid";
import { GRID_SIZE } from "./cell";

const LOOP_LENGTH_MS = 8 * 1000;
const GAME_LENGTH_MS = LOOP_LENGTH_MS * 8;
const GAME_START_DELAY_MS = 1000;

export function getNextLoopStartTime(now: number) {
  if (now % LOOP_LENGTH_MS === 0) {
    return 0;
  }
  return now + LOOP_LENGTH_MS - (now % LOOP_LENGTH_MS);
}

export function getCurrentRow(startTime: number, now: number) {
  const elapsedGameTime = now - startTime;
  if (elapsedGameTime > GAME_LENGTH_MS) {
    return undefined;
  }
  return Math.floor(elapsedGameTime / LOOP_LENGTH_MS);
}

const gameModelSchema = v.object({
  id: v.string(),
  startTime: v.number(),
  rowAssignments: v.array(v.string()),
});

export type Game = v.Infer<typeof gameModelSchema>;

const GAME_KEY = "game";

export function getGame(tx: ReadTransaction) {
  return tx.get<Game>(GAME_KEY);
}

export function setGame(tx: WriteTransaction, game: Game) {
  return tx.set(GAME_KEY, game);
}

export async function startGame(tx: WriteTransaction) {
  if (tx.location !== "server") {
    return;
  }
  const now = Date.now();
  const existingGame = await getGame(tx);
  console.log("startGame");

  if (!existingGame || now - existingGame.startTime > GAME_LENGTH_MS) {
    console.log("creating new game");
    const recentActiveClients = [
      ...Object.keys(await getRecentlyActiveClients(tx)),
    ].sort();

    const rowAssignments = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      rowAssignments[i] = recentActiveClients[i % recentActiveClients.length];
    }
    console.log(recentActiveClients);
    console.log({
      id: nanoid(),
      startTime: getNextLoopStartTime(now + GAME_START_DELAY_MS),
      rowAssignments,
    });
    await setGame(tx, {
      id: nanoid(),
      startTime: getNextLoopStartTime(now + GAME_START_DELAY_MS),
      rowAssignments,
    });
  }
}

const recentlyActiveClientsSchema = v.record(
  v.object({
    lastActivityTimestamp: v.number(),
  })
);

type RecentlyActiveClients = v.Infer<typeof recentlyActiveClientsSchema>;

const RECENT_ACTIVE_CLIENTS_KEY = "recentActiveClients";
const RECENT_ACTIVE_THRESHOLD_MS = 3_000;

async function getRecentlyActiveClients(tx: ReadTransaction) {
  return (await tx.get<RecentlyActiveClients>(RECENT_ACTIVE_CLIENTS_KEY)) ?? {};
}

export async function updateRecentlyActiveClients(
  tx: WriteTransaction,
  { disconnect } = { disconnect: false }
) {
  if (tx.location !== "server") {
    return;
  }
  const recentlyActiveClients =
    (await tx.get<RecentlyActiveClients>(RECENT_ACTIVE_CLIENTS_KEY)) ?? {};
  const now = Date.now();
  console.log(
    "updateRecentlyActiveClients",
    recentlyActiveClients,
    now,
    tx.clientID,
    disconnect
  );
  const updated: RecentlyActiveClients = { ...recentlyActiveClients };
  let newClientID = undefined;
  if (!disconnect) {
    newClientID = !Object.hasOwn(recentlyActiveClients, tx.clientID)
      ? tx.clientID
      : undefined;
    updated[tx.clientID] = { lastActivityTimestamp: now };
  }
  const deleted = new Set();
  for (const [clientID, { lastActivityTimestamp }] of Object.entries(updated)) {
    if (
      (disconnect && clientID == tx.clientID) ||
      now - lastActivityTimestamp > RECENT_ACTIVE_THRESHOLD_MS
    ) {
      delete updated[clientID];
      deleted.add(clientID);
    }
  }

  const updatedKeys = [...Object.keys(updated)];
  await tx.set(RECENT_ACTIVE_CLIENTS_KEY, updated);

  if (updatedKeys.length === 0) {
    console.log(
      "deleting game because no active clients, or new client is only recently active",
      {
        txClientID: tx.clientID,
        updatedKeys,
        newClientID,
        recentlyActiveClients,
      }
    );
    await tx.del(GAME_KEY);
    return;
  }

  console.log("updateRecentlyActiveClients setting", updated);
  if (newClientID === undefined && deleted.size === 0) {
    return;
  }
  console.log("updating game", newClientID, [...deleted]);
  const game = await getGame(tx);
  if (game === undefined) {
    return;
  }
  const currentRow = getCurrentRow(game.startTime, now);
  if (currentRow === undefined || currentRow === GRID_SIZE - 1) {
    return;
  }
  console.log("updating row assignments");
  const updatedRowAssignments = [...game.rowAssignments];
  // Exactly one delete and one add, replace deleted with new to minimize
  // disruption
  if (deleted.size === 1 && newClientID !== undefined) {
    console.log("basic");
    for (let i = currentRow + 1; i < updatedRowAssignments.length; i++) {
      if (deleted.has(updatedRowAssignments[i])) {
        updatedRowAssignments[i] = newClientID;
      }
    }
  } else {
    const order: string[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const clientID = game.rowAssignments[(currentRow + 1 + i) % GRID_SIZE];
      if (Object.hasOwn(updated, clientID) && order.indexOf(clientID) === -1) {
        order.push(clientID);
      }
    }
    if (newClientID !== undefined) {
      let newInserted = false;
      for (let i = 0; i < order.length && !newInserted; i++) {
        if (game.rowAssignments.indexOf(order[i]) <= currentRow) {
          order.splice(i, 0, newClientID);
          newInserted = true;
        }
      }
      if (!newInserted) {
        order.push(newClientID);
      }
    }
    for (
      let i = currentRow + 1, j = 0;
      i < updatedRowAssignments.length;
      i++, j++
    ) {
      updatedRowAssignments[i] = order[j % order.length];
    }
    console.log(
      "updatedRowAssignments",
      game.rowAssignments,
      order,
      updatedRowAssignments
    );
  }
  await setGame(tx, {
    ...game,
    rowAssignments: updatedRowAssignments,
  });
}

export function alive() {}

export function unload() {}

export function decorateWithUpdateRecentlyActiveClients<MD extends MutatorDefs>(
  mutators: MD
): MD {
  return Object.fromEntries(
    Object.entries(mutators).map(([name, mutator]) => {
      return [
        name,
        async (tx: WriteTransaction, ...args: [] | [ReadonlyJSONValue]) => {
          await updateRecentlyActiveClients(tx);
          return mutator(tx, ...args);
        },
      ];
    })
  ) as MD;
}

export const mutators = {
  startGame,
  alive,
  unload,
};
