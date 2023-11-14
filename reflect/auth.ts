import {
  MutatorDefs,
  ReadonlyJSONValue,
  WriteTransaction,
} from "@rocicorp/reflect";
import { RoomType, getRoomTypeForRoomID } from "./model/rooms";

export const authHandler = (_auth: string, roomID: string) => {
  return {
    userID: "anon",
    roomID,
  };
};

export function isForAllowedRoomType(
  tx: WriteTransaction,
  ...allowedRoomsTypes: RoomType[]
) {
  // only do auth checks on server
  if (tx.location === "client") {
    return true;
  }
  // on server, auth should be populated and have a roomID property
  // see authHandler
  if (!tx.auth || typeof tx.auth?.roomID !== "string") {
    return false;
  }
  console.log(tx.auth.roomID);
  const roomType = getRoomTypeForRoomID(tx.auth.roomID);
  console.log(roomType);
  if (roomType === undefined) {
    return false;
  }
  return allowedRoomsTypes.indexOf(roomType) >= 0;
}

export function decorateWithAllowedRoomTypeCheck<MD extends MutatorDefs>(
  mutators: MD,
  ...allowedRoomsTypes: RoomType[]
): MD {
  return Object.fromEntries(
    Object.entries(mutators).map(([name, mutator]) => {
      return [
        name,
        (tx: WriteTransaction, ...args: [] | [ReadonlyJSONValue]) => {
          if (isForAllowedRoomType(tx, ...allowedRoomsTypes)) {
            return mutator(tx, ...args);
          }
          console.log("not allowing due to auth", name);
        },
      ];
    })
  ) as MD;
}
