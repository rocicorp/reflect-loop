import type { ReflectServerOptions } from "@rocicorp/reflect/server";
import { ORCH_M, orchestratorMutators } from "./mutators";

function makeOptions(): ReflectServerOptions<ORCH_M> {
  return {
    mutators: orchestratorMutators,
  };
}

export { makeOptions as default };
