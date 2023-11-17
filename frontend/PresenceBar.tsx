import styles from "./PrescenceBar.module.css";
import { Reflect } from "@rocicorp/reflect/client";
import { usePresentClients } from "../reflect/subscriptions";
import { flagEmojiForLocation } from "./location";
import { Client } from "../reflect/model/client";
import { colorStringForColorID } from "../reflect/model/colors";
import { PLAY_M } from "../reflect/play/mutators";
import { SHARE_M } from "../reflect/share/mutators";

export default function PresenceBar({
  r,
}: {
  r: Reflect<PLAY_M | SHARE_M> | undefined;
}) {
  const presentClients = usePresentClients(r);
  return (
    <div className={styles.presenceAvatars}>
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
      className={styles.presenceAvatar}
      style={{ borderColor: colorStringForColorID(color) }}
    >
      {flagEmojiForLocation(location)}
    </span>
  );
}
