import { Reflect } from "@rocicorp/reflect/client";
import { Cell, listCells } from "../reflect/model/cell";
import { PLAY_M } from "../reflect/play/mutators";
import { SHARE_M } from "../reflect/share/mutators";

export async function getShareURL(r: Reflect<PLAY_M | SHARE_M> | undefined) {
  const url = new URL(window.location.href);
  if (r) {
    const cellsEncoded = (await r.query(listCells))
      .map((cell) => `${cell.id}${cell.color}`)
      .join("-");
    url.search = `s=${cellsEncoded}`;
  }
  return url.toString();
}

export type ShareInfo = {
  encodedCells: string;
  cells: Record<string, Cell>;
};

export function getShareInfo(
  encoded: string | undefined
): ShareInfo | undefined {
  if (!encoded) {
    return;
  }
  const parts = encoded.split("-");
  if (parts.length === 0) {
    return;
  }
  const cells: Record<string, Cell> = {};
  for (const part of parts) {
    if (part.length < 3) {
      return;
    }
    // TODO: validate cellID and color
    const cellID = part.substring(0, 2);
    const color = part.substring(2);
    cells[cellID] = { id: cellID, color };
  }
  return { encodedCells: encoded, cells };
}
