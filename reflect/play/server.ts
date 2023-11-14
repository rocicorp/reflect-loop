import type { ReflectServerOptions } from "@rocicorp/reflect/server";
import { PLAY_M, playMutators } from "./mutators.js";

function makeOptions(): ReflectServerOptions<PLAY_M> {
  return {
    mutators: playMutators,
  };
}

export { makeOptions as default };
