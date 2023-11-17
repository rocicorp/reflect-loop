import type { ReflectServerOptions } from "@rocicorp/reflect/server";
import { SHARE_M, shareMutators } from "./mutators";

function makeOptions(): ReflectServerOptions<SHARE_M> {
  return {
    mutators: shareMutators,
  };
}

export { makeOptions as default };
