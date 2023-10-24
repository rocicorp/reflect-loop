import { generate } from "@rocicorp/rails";

export const gridSize = 8;
export const numCells = gridSize * gridSize;

export type Cell = {
  id: string;
};

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
} = generate<Cell>("cell");

export function idToCoords(id: string): [number, number] {
  const i = parseInt(id);
  return [i % gridSize, Math.floor(i / gridSize)];
}

export function coordsToID(x: number, y: number): string {
  return indexToID(x + y * gridSize);
}

export function indexToID(i: number): string {
  return String(i).padStart(2, "0");
}
