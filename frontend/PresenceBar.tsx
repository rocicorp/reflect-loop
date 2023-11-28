import styles from "./PrescenceBar.module.css";
import { Reflect } from "@rocicorp/reflect/client";
import { usePresentClients } from "../reflect/subscriptions";
import { flagEmojiForLocation } from "./location";
import { Client } from "../reflect/model/client";
import { colorStringForColorID } from "../reflect/model/colors";
import { PLAY_M } from "../reflect/play/mutators";
import { SHARE_M } from "../reflect/share/mutators";
import classNames from "classnames";

export default function PresenceAvatars({
  r,
}: {
  r: Reflect<PLAY_M | SHARE_M> | undefined;
}) {
  const presentClients = usePresentClients(r);
  return (
    <>
      {presentClients
        .slice(0, 8)
        .map((client, i) =>
          i === 8 && presentClients.length > 8 ? (
            <PresenceOverflow
              number={presentClients.length - 7}
              key={"overflow"}
            />
          ) : (
            <PresenceAvatar client={client} key={client.id} />
          )
        )}
    </>
  );
}

function PresenceAvatar({ client }: { client: Client }) {
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

function PresenceOverflow({ number }: { number: number }) {
  return (
    <span
      className={classNames(styles.presenceAvatar, styles.PresenceOverflow)}
    >
      {`+${number}`}
    </span>
  );
}
