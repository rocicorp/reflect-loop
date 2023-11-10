import { setCellEnabled } from "./model/cell";
import { initClient, updateCursor, updateLocation } from "./model/client";
import { alive, unload } from "./model/orchestrator";

export type M = typeof mutators;

export const mutators = {
  setCellEnabled,
  initClient,
  updateCursor,
  updateLocation,

  // orchestrator mutators
  alive,
  unload,
};
