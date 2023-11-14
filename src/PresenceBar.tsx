import "./PrescenceBar.css";
import { Reflect } from "@rocicorp/reflect/client";
import { usePresentClients } from "../reflect/subscriptions.js";
import { flagEmojiForLocation } from "./location.js";
import { Client } from "../reflect/model/client.js";
import { colorStringForColorID } from "../reflect/model/colors.js";
import { PLAY_M } from "../reflect/play/mutators.js";
import { SHARE_M } from "../reflect/share/mutators.js";

export default function PresenceBar({
  r,
}: {
  r: Reflect<PLAY_M | SHARE_M> | undefined;
}) {
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
    <span
      className="presenceAvatar"
      style={{ borderColor: colorStringForColorID(color) }}
    >
      {flagEmojiForLocation(location)}
    </span>
  );
}
