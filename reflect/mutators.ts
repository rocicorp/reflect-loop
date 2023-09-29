import {WriteTransaction} from 'replicache';
import {
  idToCoords,
  gridSize,
  coordsToID,
  mustGetCell,
  putCell,
  updateCell,
} from '../src/cell';

export type M = typeof mutators;

export const mutators = {
  toggleCell,
};

async function toggleCell(tx: WriteTransaction, id: string) {
  const prev = await mustGetCell(tx, id);
  const next = {...prev, enabled: !prev.enabled};
  await putCell(tx, next);

  if (!prev.enabled) {
    const [x, y] = idToCoords(id);
    for (let i = 0; i < gridSize; i++) {
      if (i !== x) {
        await updateCell(tx, {
          id: coordsToID(i, y),
          enabled: false,
        });
      }
    }
  }
}
