import { mutators as cellMutators } from "./model/cell";
import { mutators as clientMutators } from "./model/client";
import { mutators as orchestratorMutators } from "./model/orchestrator";

export type M = typeof mutators;

export const mutators = {
  ...cellMutators,
  ...clientMutators,
  ...orchestratorMutators,
};
