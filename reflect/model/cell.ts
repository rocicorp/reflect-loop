import { generate } from "@rocicorp/rails";
import * as v from "@badrap/valita";
import { WriteTransaction } from "@rocicorp/reflect";
import { getClient } from "./client";
import { colorIDFromID } from "./colors";

export const GRID_SIZE = 8;
export const NUM_CELLS = GRID_SIZE * GRID_SIZE;

const cellSchema = v.object({
  id: v.string(),
  color: v.string(),
});

export type Cell = v.Infer<typeof cellSchema>;

export const {
  init: initCell,
  listIDs: listCellIDs,
  list: listCells,
  has: hasCell,
  get: getCell,
  delete: deleteCell,
  mustGet: mustGetCell,
  put: putCell,
  update: updateCell,
} = generate<Cell>("cell", cellSchema.parse.bind(cellSchema));

export async function setCellEnabled(
  tx: WriteTransaction,
  { id, enabled }: { id: string; enabled: boolean }
) {
  if (enabled) {
    const client = await getClient(tx, tx.clientID);
    await initCell(tx, {
      id,
      color: client?.color ?? colorIDFromID(tx.clientID),
    });
  } else {
    await deleteCell(tx, id);
  }
}

export function idToCoords(id: string): [number, number] {
  const i = parseInt(id);
  return [i % GRID_SIZE, Math.floor(i / GRID_SIZE)];
}

export function coordsToID(x: number, y: number): string {
  return indexToID(x + y * GRID_SIZE);
}

export function indexToID(i: number): string {
  return String(i).padStart(2, "0");
}
