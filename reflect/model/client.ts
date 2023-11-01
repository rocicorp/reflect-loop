import * as v from "@badrap/valita";
import { Update, generate } from "@rocicorp/rails";
import { WriteTransaction } from "@rocicorp/reflect";
import { colorToString, idToColor } from "./colors";

const cursorSchema = v.object({ x: v.number(), y: v.number() });
const clientModelSchema = v.object({
  id: v.string(),
  color: v.string(),
  cursor: cursorSchema.optional(),
  location: v.string().optional(),
});

export type CursorModel = v.Infer<typeof cursorSchema>;
export type ClientModel = v.Infer<typeof clientModelSchema>;
export type ClientModelUpdate = Update<ClientModel>;
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
  { location }: { location: string }
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

function allowLocation(location: string | null): boolean {
  return (
    typeof location === "string" &&
    !/\.\/\\:<>\|/.test(location) &&
    // Note: this includes the flag and space too.
    location.length <= 24
  );
}

export const updateCursor = async (
  tx: WriteTransaction,
  cursor: CursorModel
) => {
  await clientGenerateResult.update(tx, {
    id: tx.clientID,
    cursor,
  });
};
