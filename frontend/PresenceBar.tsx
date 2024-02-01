import styles from "./PrescenceBar.module.css";
import { Reflect } from "@rocicorp/reflect/client";
import { usePresentClients } from "../reflect/subscriptions";
import { flagEmojiForLocation } from "./location";
import { Client } from "../reflect/model/client";
import { colorStringForColorID } from "../reflect/model/colors";
import { PLAY_M } from "../reflect/play/mutators";
import { SHARE_M } from "../reflect/share/mutators";
import { useElementSize, useWindowSize } from "./sizeHooks";

// includes border and margin
// 32 width + 3 left border + 3 right border + 8 right margin
const AVATAR_WIDTH_PX = 46;
const MARGIN_RIGHT_PX = 8;

export default function PresenceAvatars({
  r,
}: {
  r: Reflect<PLAY_M | SHARE_M> | undefined;
}) {
  const windowSize = useWindowSize();
  const [containerRef, containerRect] = useElementSize<HTMLDivElement>([
    windowSize,
  ]);

  const numToDisplay = containerRect
    ? Math.floor((containerRect.width + MARGIN_RIGHT_PX) / AVATAR_WIDTH_PX)
    : 8;

  const presentClients = usePresentClients(r);
  return (
    <div ref={containerRef} className={styles.container}>
      {presentClients
        .slice(0, numToDisplay)
        .map((client, i) =>
          i === numToDisplay - 1 && presentClients.length > numToDisplay ? (
            <PresenceOverflow
              number={presentClients.length - numToDisplay + 1}
              key={"overflow"}
            />
          ) : (
            <PresenceAvatar client={client} key={client.clientID} />
          )
        )}
    </div>
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
  return <span className={styles.presenceOverflow}>{`+${number}`}</span>;
}
