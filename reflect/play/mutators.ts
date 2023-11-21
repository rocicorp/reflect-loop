import { mutators as cellMutators } from "../model/cell";
import { mutators as clientMutators } from "../model/client";
import {
  decorateWithUpdateRecentlyActiveClients,
  mutators as gameMutators,
} from "../model/game";

export type PLAY_M = typeof playMutators;

export const playMutators = decorateWithUpdateRecentlyActiveClients({
  ...cellMutators,
  ...clientMutators,
  ...gameMutators,
});
