import type { Reflect } from "@rocicorp/reflect/client";
import { usePresence, useSubscribe } from "@rocicorp/reflect/react";
import { Client, getClient } from "./model/client";
import { PLAY_M } from "./play/mutators";
import { SHARE_M } from "./share/mutators";

export function useSelfColor(r: Reflect<PLAY_M | SHARE_M> | undefined) {
  return useSubscribe(
    r,
    async (tx) => (await getClient(tx, tx.clientID))?.color,
    null
  );
}

export function usePresentClients(
  r: Reflect<PLAY_M | SHARE_M> | undefined
): Client[] {
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
