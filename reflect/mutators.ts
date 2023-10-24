import { WriteTransaction } from "@rocicorp/reflect";
import {
  idToCoords,
  gridSize,
  coordsToID,
  deleteCell,
  initCell,
} from "../src/cell";

export type M = typeof mutators;

export const mutators = {
  setCellEnabled,
};

async function setCellEnabled(
  tx: WriteTransaction,
  { id, enabled }: { id: string; enabled: boolean }
) {
  const [x, y] = idToCoords(id);
  for (let i = 0; i < gridSize; i++) {
    const id = coordsToID(i, y);
    if (i === x && enabled) {
      await initCell(tx, { id });
    } else {
      await deleteCell(tx, id);
    }
  }
}
