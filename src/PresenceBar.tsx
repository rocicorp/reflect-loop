import { Reflect } from "@rocicorp/reflect/client";
import { M } from "../reflect/mutators.js";
import { usePresentClients } from "../reflect/subscriptions.js";
import { flagEmojiForLocation } from "./location.js";
import { Client } from "../reflect/model/client.js";
import "./PrescenceBar.css";

export default function PresenceBar({ r }: { r: Reflect<M> }) {
  const presentClients = usePresentClients(r);
  return (
    <div className="presenceAvatars">
      {presentClients.map((client) => (
        <PresenceAvatars client={client} key={client.id} />
      ))}
    </div>
  );
}

function PresenceAvatars({ client }: { client: Client }) {
  const { color, location } = client;

  return (
    <span className="presenceAvatar" style={{ borderColor: color }}>
      {flagEmojiForLocation(location)}
    </span>
  );
}
