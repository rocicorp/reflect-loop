// This file defines our "mutators".
//
// Mutators are how you change data in Reflect apps.
//
// They are registered with Reflect at construction-time and callable like:
// `myReflect.mutate.increment()`.
//
// Reflect runs each mutation immediately (optimistically) on the client,
// against the local cache, and then later (usually moments later) sends a
// description of the mutation (its name and arguments) to the server, so that
// the server can *re-run* the mutation there against the authoritative
// datastore.
//
// This re-running of mutations is how Reflect handles conflicts: the
// mutators defensively check the database when they run and do the appropriate
// thing. The Reflect sync protocol ensures that the server-side result takes
// precedence over the client-side optimistic result.

import type {WriteTransaction} from '@rocicorp/reflect';

export const mutators = {
  activateCell,
  deactivateCell
};

export type M = typeof mutators;

async function activateCell(
  tx: WriteTransaction,
  { key }: { key: string }
) {
  console.log(`activating cell ${key}`);
  await tx.put(key, true);
}

async function deactivateCell(
  tx: WriteTransaction,
  { key }: { key: string }
) {
  console.log(`deactivating cell ${key}`);
  await tx.put(key, false);
}