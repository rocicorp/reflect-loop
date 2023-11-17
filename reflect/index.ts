import type { ReflectServerOptions } from "@rocicorp/reflect/server";
import { M, mutators } from "./mutators";

function makeOptions(): ReflectServerOptions<M> {
  return {
    authHandler: (_auth: string, roomID: string) => {
      return {
        userID: "anon",
        roomID,
      };
    },
    mutators,
  };
}

export { makeOptions as default };
