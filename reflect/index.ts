import type {ReflectServerOptions} from '@rocicorp/reflect/server';
import {M, mutators} from './mutators.js';
import {coordsToID, gridSize, putCell} from '../src/cell.ts';

function makeOptions(): ReflectServerOptions<M> {
  return {
    mutators,
    roomStartHandler: async tx => {
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          putCell(tx, {
            id: coordsToID(x, y),
            enabled: false,
          });
        }
      }
    },
  };
}

export {makeOptions as default};
