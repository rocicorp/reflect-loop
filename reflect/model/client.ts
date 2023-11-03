import * as v from "@badrap/valita";
import { Update, generate } from "@rocicorp/rails";
import { WriteTransaction } from "@rocicorp/reflect";
import { colorToString, idToColor } from "./colors";

const cursorSchema = v.object({ x: v.number(), y: v.number() });
const locationSchema = v.object({
  city: v.string(),
  country: v.string(),
});
const clientModelSchema = v.object({
  id: v.string(),
  color: v.string(),
  cursor: cursorSchema.optional(),
  location: locationSchema.optional(),
});

export type Cursor = v.Infer<typeof cursorSchema>;
export type Location = v.Infer<typeof locationSchema>;
export type Client = v.Infer<typeof clientModelSchema>;
export type ClientUpdate = Update<Client>;
const clientGenerateResult = generate(
  "client",
  clientModelSchema.parse.bind(clientModelSchema)
);

export const { get: getClient } = clientGenerateResult;

export const initClient = async (tx: WriteTransaction) => {
  const id = tx.clientID;
  const client = {
    id,
    color: colorToString(idToColor(id)),
  };
  await clientGenerateResult.put(tx, client);
};

export const updateLocation = async (
  tx: WriteTransaction,
  location: Location
) => {
  if (!allowLocation(location)) {
    return;
  }
  const id = tx.clientID;
  const client = {
    id,
    location,
  };
  await clientGenerateResult.update(tx, client);
};

function allowLocation(location: Location): boolean {
  return (
    typeof location === "object" &&
    !/\.\/\\:<>\|/.test(location.country) &&
    !/\.\/\\:<>\|/.test(location.city)
  );
}

export const updateCursor = async (tx: WriteTransaction, cursor: Cursor) => {
  await clientGenerateResult.update(tx, {
    id: tx.clientID,
    cursor,
  });
};
