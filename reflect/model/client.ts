import * as v from "@badrap/valita";
import { Update, generatePresence } from "@rocicorp/rails";
import { WriteTransaction } from "@rocicorp/reflect";

const cursorSchema = v.object({ x: v.number(), y: v.number() });
const locationSchema = v.object({
  city: v.string(),
  country: v.string(),
});
const clientModelSchema = v.object({
  clientID: v.string(),
  color: v.string(),
  cursor: cursorSchema.optional(),
  location: locationSchema.optional(),
  isTouch: v.boolean().optional(),
});

export type Cursor = v.Infer<typeof cursorSchema>;
export type Location = v.Infer<typeof locationSchema>;
export type Client = v.Infer<typeof clientModelSchema>;
export type ClientUpdate = Update<Client>;
const clientGenerated = generatePresence(
  "client",
  clientModelSchema.parse.bind(clientModelSchema)
);

export const { get: getClient } = clientGenerated;

const initClient = async (
  tx: WriteTransaction,
  { color }: { color: string }
) => {
  const client = {
    color,
  };
  await clientGenerated.set(tx, client);
};

const updateLocation = async (tx: WriteTransaction, location: Location) => {
  if (!allowLocation(location)) {
    return;
  }
  const client = {
    location,
  };
  await clientGenerated.update(tx, client);
};

function allowLocation(location: Location): boolean {
  return (
    typeof location === "object" &&
    !/\.\/\\:<>\|/.test(location.country) &&
    !/\.\/\\:<>\|/.test(location.city)
  );
}

const updateCursor = async (tx: WriteTransaction, cursor: Cursor) => {
  await clientGenerated.update(tx, {
    cursor,
  });
};

const markAsTouchClient = async (tx: WriteTransaction) => {
  await clientGenerated.update(tx, {
    isTouch: true,
  });
};

export const mutators = {
  initClient,
  updateLocation,
  updateCursor,
  markAsTouchClient,
};
