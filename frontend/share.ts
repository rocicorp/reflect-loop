import { Reflect } from "@rocicorp/reflect/client";
import { Cell, listCells } from "../reflect/model/cell";
import { PLAY_M } from "../reflect/play/mutators";
import { SHARE_M } from "../reflect/share/mutators";
import { getRandomPlayRoomID } from "../reflect/model/rooms";

export type ShareType = "snapshot" | "collaborate";

export async function getShareURL(
  r: Reflect<PLAY_M | SHARE_M>,
  config:
    | { type: "snapshot" }
    | { type: "collaborate"; preferredRoomID: string | undefined }
) {
  const url = new URL(window.location.href);
  url.search = "";
  const cellsEncoded = (await r.query(listCells))
    .map((cell) => `${cell.id}${cell.color}`)
    .join("-");
  url.searchParams.set("s", cellsEncoded);
  if (config.type === "collaborate") {
    url.searchParams.set("r", config.preferredRoomID ?? getRandomPlayRoomID());
  }
  console.log(config, url.toString());
  return url.toString();
}

export type ShareInfo =
  | {
      type: "snapshot";
      encodedCells: string;
      cells: Record<string, Cell>;
    }
  | {
      type: "collaborate";
      encodedCells: string;
      cells: Record<string, Cell>;
      preferredRoomID: string;
    };

export function getShareInfo(
  encodedCells: string | undefined,
  preferredRoomID: string | undefined
): ShareInfo | undefined {
  if (!encodedCells && !preferredRoomID) {
    return;
  }
  const cells = decodeCells(encodedCells) ?? {};
  if (preferredRoomID) {
    return {
      type: "collaborate",
      encodedCells: encodedCells ?? "",
      cells: cells,
      preferredRoomID,
    };
  } else {
    return {
      type: "snapshot",
      encodedCells: encodedCells ?? "",
      cells: cells,
    };
  }
}

function decodeCells(encoded: string | undefined) {
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
  return cells;
}
