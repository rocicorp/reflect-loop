import { setCellEnabled } from "./model/cell";
import { initClient, updateCursor, updateLocation } from "./model/client";

export type M = typeof mutators;

export const mutators = {
  setCellEnabled,
  initClient,
  updateCursor,
  updateLocation,
};
