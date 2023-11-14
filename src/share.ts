import { Reflect } from "@rocicorp/reflect/client";
import { M } from "../reflect/mutators.js";
import { Cell, listCells } from "../reflect/model/cell";

export async function getShareURL(r: Reflect<M> | undefined) {
  const url = new URL(window.location.href);
  if (r) {
    const cellsEncoded = (await r.query(listCells))
      .map((cell) => `${cell.id}${cell.color}`)
      .join("-");
    url.search = `s=${cellsEncoded}`;
  }
  return url.toString();
}

export function getShareInfo() {
  const url = new URL(location.href);
  const encoded = url.searchParams.get("s");
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
  return { roomID: encoded, cells };
}
