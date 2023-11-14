import { mutators as cellMutators } from "../model/cell";
import { mutators as clientMutators } from "../model/client";

export type PLAY_M = typeof playMutators;

export const playMutators = {
  ...cellMutators,
  ...clientMutators,
};
