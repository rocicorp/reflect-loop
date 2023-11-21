import type { ReflectServerOptions } from "@rocicorp/reflect/server";
import { PLAY_M, playMutators } from "./mutators";
import { updateRecentlyActiveClients } from "../model/game";

function makeOptions(): ReflectServerOptions<PLAY_M> {
  return {
    mutators: playMutators,
    disconnectHandler: async (tx) => {
      await updateRecentlyActiveClients(tx, { disconnect: true });
    },
  };
}

export { makeOptions as default };
