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

const cellGenerated = generate<Cell>("cell", cellSchema.parse.bind(cellSchema));

export const { list: listCells } = cellGenerated;

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

async function ensureOneCellEnabled(tx: WriteTransaction) {
  if (tx.location !== "server") {
    return;
  }
  const cells = await listCells(tx);
  if (cells.length === 0) {
    const randCoord = () => Math.floor(Math.random() * GRID_SIZE);
    const randomID = coordsToID(randCoord(), randCoord());
    await setCellEnabled(tx, { id: randomID, enabled: true, exclusive: false });
  }
}

async function setCellEnabled(
  tx: WriteTransaction,
  {
    id,
    enabled,
    exclusive = true,
  }: { id: string; enabled: boolean; exclusive: boolean }
) {
  if (enabled) {
    if (exclusive) {
      const [, y] = idToCoords(id);
      for (let i = 0; i < GRID_SIZE; i++) {
        const id = coordsToID(i, y);
        await cellGenerated.delete(tx, id);
      }
    }
    const client = await getClient(tx);
    await cellGenerated.put(tx, {
      id,
      color: client?.color ?? colorIDFromID(tx.clientID),
    });
  } else {
    await cellGenerated.delete(tx, id);
  }
}

export const mutators = {
  setCellEnabled,
  ensureOneCellEnabled,
};
