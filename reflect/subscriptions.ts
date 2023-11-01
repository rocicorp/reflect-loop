import type { Reflect } from "@rocicorp/reflect/client";
import { useSubscribe } from "@rocicorp/reflect/react";
import { getClient } from "./model/client.js";
import type { M } from "./mutators.js";

export function useSelfColor(r: Reflect<M>) {
  return useSubscribe(
    r,
    async (tx) => (await getClient(tx, tx.clientID))?.color,
    null
  );
}

export function useSelfClient(r: Reflect<M>) {
  return useSubscribe(r, async (tx) => await getClient(tx, tx.clientID), null);
}

export function useClient(r: Reflect<M>, id: string) {
  return useSubscribe(r, (tx) => getClient(tx, id), null);
}
