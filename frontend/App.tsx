import React, { useEffect, useRef, useState } from "react";
import Grid from "./Grid";
import Footer from "./Footer";
import { Reflect } from "@rocicorp/reflect/client";
import CursorField from "./CursorField";
import { Rect } from "./coordinates";
import { ShareInfo, ShareType, getShareURL } from "./share";
import { getClientRoomAssignment } from "../reflect/model/orchestrator";
import {
  getOrchstratorRoomID,
  getRandomPlayRoomID,
} from "../reflect/model/rooms";
import { shareMutators } from "../reflect/share/mutators";
import { playMutators } from "../reflect/play/mutators";
import { orchestratorMutators } from "../reflect/orchestrator/mutators";
import { Room } from "./room";
import LoopLogo from "./LoopLogo";
import ShareModal from "./ShareModal";
import { useElementSize, useWindowSize } from "./sizeHooks";
import { event } from "nextjs-google-analytics";
import styles from "./App.module.css";

const orchestratorServer =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_SERVER ?? "http://127.0.0.1:8080/";
const playServer =
  process.env.NEXT_PUBLIC_PLAY_SERVER ?? "http://127.0.0.1:8080/";
const shareServer =
  process.env.NEXT_PUBLIC_SHARE_SERVER ?? "http://127.0.0.1:8080/";

type RoomAssignment = { roomID: string; color: string };

function useRoomAssignment(shareInfo: ShareInfo | undefined) {
  const [roomAssignment, setRoomAssignment] = useState<
    RoomAssignment | undefined
  >(undefined);
  useEffect(() => {
    const orchestratorR = new Reflect({
      server: orchestratorServer,
      userID: "anon",
      roomID: getOrchstratorRoomID(
        shareInfo ? shareInfo.encodedCells : "public"
      ),
      mutators: orchestratorMutators,
    });

    orchestratorR.subscribe(
      async (tx) => {
        const clientRoomAssignment = await getClientRoomAssignment(
          tx,
          tx.clientID
        );
        if (!clientRoomAssignment) {
          return undefined;
        }
        return {
          roomID: clientRoomAssignment.roomID,
          color: clientRoomAssignment.color,
        };
      },
      {
        onData: (result) => {
          setRoomAssignment((prev) => {
            const newVal = result;
            if (prev?.roomID !== newVal?.roomID) {
              console.info("New room assignment", newVal);
            }
            return newVal;
          });
        },
      }
    );
    const aliveIfVisible = () => {
      if (document.visibilityState === "visible") {
        void orchestratorR.mutate.alive(
          shareInfo
            ? shareInfo.type === "collaborate"
              ? { type: "play", preferredRoomID: shareInfo.preferredRoomID }
              : {
                  type: "share",
                  encodedCells: shareInfo.encodedCells,
                }
            : { type: "play" }
        );
      }
    };
    aliveIfVisible();
    const ORCHESTRATOR_ALIVE_INTERVAL_MS = 10_000;
    const aliveInterval = setInterval(
      aliveIfVisible,
      ORCHESTRATOR_ALIVE_INTERVAL_MS
    );
    const visibilityChangeListener = () => {
      aliveIfVisible();
    };
    document.addEventListener("visibilitychange", visibilityChangeListener);
    const pageHideListener = () => {
      void orchestratorR.mutate.unload();
    };
    window.addEventListener("pagehide", pageHideListener);

    return () => {
      clearInterval(aliveInterval);
      document.removeEventListener(
        "visibilitychange",
        visibilityChangeListener
      );
      window.removeEventListener("pagehide", pageHideListener);
      void orchestratorR.close();
    };
    // Run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareInfo]);
  return roomAssignment;
}

function useRoom(
  shareInfo: ShareInfo | undefined,
  roomAssignment: RoomAssignment | undefined
) {
  const [room, setRoom] = useState<Room>();

  useEffect(() => {
    let room: Room;
    console.log("createroom");

    if (roomAssignment === undefined) {
      return;
    }

    if (shareInfo?.type === "snapshot") {
      room = {
        type: "share",
        r: new Reflect({
          roomID: roomAssignment.roomID,
          userID: "anon",
          mutators: shareMutators,
          server: shareServer,
        }),
        fixedCells: shareInfo.cells,
      };
    } else {
      room = {
        type: "play",
        r: new Reflect({
          roomID: roomAssignment.roomID,
          userID: "anon",
          mutators: playMutators,
          server: playServer,
        }),
      };
    }

    void room.r.mutate.initClient({ color: roomAssignment.color });
    if (room.type === "play") {
      void room.r.mutate.ensureOneCellEnabled();
    }
    const clientLocation = fetch("https://reflect.net/api/get-location")
      .then((resp) => resp.json())
      .then((data) => {
        const { country, city } = data;
        return { country, city };
      })
      .catch(() => {
        return undefined;
      });
    clientLocation.then(async (loc) => {
      if (loc && !room.r.closed) {
        void room.r.mutate.updateLocation(loc);
      }
    });

    setRoom(room);
    return () => {
      setRoom(undefined);
      void room.r.close();
    };
  }, [shareInfo, roomAssignment]);

  return room;
}

const createPlayURL = () => {
  const url = new URL(location.href);
  url.search = "";
  url.pathname = "";
  return url.toString();
};

const createNewURL = () => {
  const url = new URL(location.href);
  url.search = "";
  url.pathname = "";
  url.searchParams.set("r", getRandomPlayRoomID());
  return url.toString();
};

const animateMessage = (messageDiv: HTMLDivElement | null) => {
  messageDiv?.animate(
    [{ opacity: "1" }, { opacity: "1", offset: 0.8 }, { opacity: "0" }],
    {
      duration: 2500,
    }
  );
};

const App = ({
  shareInfo,
  exclusive,
}: {
  shareInfo: ShareInfo | undefined;
  exclusive: boolean;
}) => {
  const roomAssignment = useRoomAssignment(shareInfo);
  const room = useRoom(shareInfo, roomAssignment);

  const windowSize = useWindowSize();
  const [appRef, appRect] = useElementSize<HTMLDivElement>([windowSize]);
  const [docRect, setDocRect] = useState<Rect | null>(null);
  const copyMessageRef = useRef<HTMLDivElement>(null);
  const createMessageRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setDocRect(
      new Rect(0, 0, document.body.scrollWidth, document.body.scrollHeight)
    );
  }, [windowSize]);

  const createShareURL = (type: ShareType) => {
    if (!room) {
      return createPlayURL();
    }
    if (type === "snapshot") {
      return getShareURL(room.r, { type }, exclusive);
    }
    return getShareURL(
      room.r,
      {
        type: "collaborate",
        preferredRoomID: roomAssignment?.roomID,
      },
      exclusive
    );
  };

  const copyShareURL = async (type: ShareType) => {
    const url = await createShareURL(type);
    navigator.clipboard.writeText(url);
    event("copy_shareurl", {
      category: "Share",
      action: "click copy url",
      label: type,
    });
    animateMessage(copyMessageRef.current);
  };

  const handleCellClick = () => {
    if (shareInfo?.type === "snapshot") {
      animateMessage(createMessageRef.current);
    }
  };

  return (
    <div ref={appRef} className={styles.app}>
      <div className={styles.message}>
        <div ref={copyMessageRef} className={styles.copyMessage}>
          <div className={styles.copyMessageContent}>
            Link copied to clipboard
          </div>
        </div>
        <div ref={createMessageRef} className={styles.createMessage}>
          Tap Create below to make your own!
        </div>
      </div>
      <LoopLogo />
      <Grid
        room={room}
        shareInfo={shareInfo}
        exclusive={exclusive}
        onCellClick={handleCellClick}
      />
      <Footer
        onShare={
          shareInfo?.type === "snapshot" ? undefined : () => setModalOpen(true)
        }
        ctaText={shareInfo?.type === "snapshot" ? "Create" : "Create new"}
        createCtaURL={
          shareInfo?.type === "snapshot" ? createPlayURL : createNewURL
        }
        reflectUrl="https://reflect.net"
      />
      <div className={styles.footerSpacer}></div>
      <ShareModal
        isOpen={isModalOpen}
        copyShareURL={copyShareURL}
        onClose={() => setModalOpen(false)}
      />
      {room && appRect && docRect ? (
        <CursorField r={room.r} appRect={appRect} docRect={docRect} />
      ) : null}
    </div>
  );
};

export default App;
