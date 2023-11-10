import type { Reflect } from "@rocicorp/reflect/client";
import { usePresence, useSubscribe } from "@rocicorp/reflect/react";
import { Client, getClient } from "./model/client.js";
import type { M } from "./mutators.js";

export function useSelfColor(r: Reflect<M> | undefined) {
  return useSubscribe(
    r,
    async (tx) => (await getClient(tx, tx.clientID))?.color,
    null
  );
}

export function usePresentClients(r: Reflect<M> | undefined): Client[] {
  const presentClientIDs = usePresence(r);
  return useSubscribe(
    r,
    async (tx) => {
      const presentClients = [];
      for (const clientID of presentClientIDs) {
        const client = await getClient(tx, clientID);
        if (client) {
          presentClients.push(client);
        }
      }
      return presentClients;
    },
    [],
    [presentClientIDs]
  );
}
