import { Cell } from "../reflect/model/cell";
import { PLAY_M } from "../reflect/play/mutators";
import { SHARE_M } from "../reflect/share/mutators";
import { Reflect } from "@rocicorp/reflect/client";

export type Room =
  | { type: "play"; r: Reflect<PLAY_M> }
  | { type: "share"; r: Reflect<SHARE_M>; fixedCells: Record<string, Cell> };
