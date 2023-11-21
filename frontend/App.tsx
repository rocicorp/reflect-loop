import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Grid from "./Grid";
import Footer from "./Footer";
import { Reflect } from "@rocicorp/reflect/client";
import CursorField from "./CursorField";
import { Rect } from "./coordinates";
import { ShareInfo, ShareType, getShareURL } from "./share";
import {
  ClientRoomAssignment,
  getClientRoomAssignment,
} from "../reflect/model/orchestrator";
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

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useIsomorphicLayoutEffect(() => {
    setWindowSize(getWindowSize());

    const handleWindowResize = () => {
      setWindowSize(getWindowSize());
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);
  return windowSize;
}

function getWindowSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function useElementSize<T extends Element>(deps: unknown[]) {
  const ref = useRef<T>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) {
      return;
    }

    const cr = ref.current.getBoundingClientRect();
    setRect(
      new Rect(
        cr.left + ref.current.ownerDocument.documentElement.scrollLeft,
        cr.top + ref.current.ownerDocument.documentElement.scrollTop,
        cr.width,
        cr.height
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [ref, rect] as const;
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

const App = ({ shareInfo }: { shareInfo: ShareInfo | undefined }) => {
  const roomAssignment = useRoomAssignment(shareInfo);
  const room = useRoom(shareInfo, roomAssignment);

  const windowSize = useWindowSize();
  const [appRef, appRect] = useElementSize<HTMLDivElement>([windowSize]);
  const [docRect, setDocRect] = useState<Rect | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setDocRect(
      new Rect(0, 0, document.body.scrollWidth, document.body.scrollHeight)
    );
  }, [windowSize]);

  const createShareURL = async (type: ShareType) => {
    if (!room) {
      return createPlayURL();
    }
    if (type === "snapshot") {
      return getShareURL(room.r, { type });
    }
    return getShareURL(room.r, {
      type: "collaborate",
      preferredRoomID: roomAssignment?.roomID,
    });
  };

  return (
    <div ref={appRef}>
      <LoopLogo />
      <Grid room={room} shareInfo={shareInfo} />
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
      <ShareModal
        isOpen={isModalOpen}
        createShareURL={createShareURL}
        onClose={() => setModalOpen(false)}
      />
      {room && appRect && docRect ? (
        <CursorField r={room.r} appRect={appRect} docRect={docRect} />
      ) : null}
    </div>
  );
};

export default App;
