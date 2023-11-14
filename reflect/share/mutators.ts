import { mutators as clientMutators } from "../model/client";

export type SHARE_M = typeof shareMutators;

export const shareMutators = {
  ...clientMutators,
};
