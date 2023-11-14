import "./App.css";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Grid from "./Grid";
import Footer from "./Footer";
import LoopLogo from "../src/assets/loop-logo.svg?react";
import { Reflect } from "@rocicorp/reflect/client";
import CursorField from "./CursorField";
import { Rect } from "./coordinates";
import { getShareInfo, getShareURL } from "./share";
import { getClientRoomAssignment } from "../reflect/model/orchestrator";
import { randomColorID } from "../reflect/model/colors";
import { getOrchstratorRoomID } from "../reflect/model/rooms";
import { shareMutators } from "../reflect/share/mutators";
import { playMutators } from "../reflect/play/mutators";
import { orchestratorMutators } from "../reflect/orchestrator/mutators";
import { Room } from "./room";

const orchestratorServer =
  import.meta.env.VITE_REFLECT_ORCHESTRATOR_SERVER ?? "http://127.0.0.1:8080/";
const playServer =
  import.meta.env.VITE_REFLECT_PLAY_SERVER ?? "http://127.0.0.1:8080/";
const shareServer =
  import.meta.env.VITE_REFLECT_SHARE_SERVER ?? "http://127.0.0.1:8080/";

const shareInfo = getShareInfo();
const clientColor = randomColorID();
const clientLocation = fetch("https://reflect.net/api/get-location")
  .then((resp) => resp.json())
  .then((data) => {
    const { country, city } = data;
    return { country, city };
  })
  .catch(() => {
    return undefined;
  });

function useRoomID() {
  const [roomID, setRoomID] = useState<string | undefined>(undefined);
  useEffect(() => {
    const orchestratorR = new Reflect({
      server: orchestratorServer,
      userID: "anon",
      roomID: getOrchstratorRoomID(
        shareInfo ? shareInfo.encodedCells : "public"
      ),
      mutators: orchestratorMutators,
    });

    orchestratorR.subscribe((tx) => getClientRoomAssignment(tx, tx.clientID), {
      onData: (result) => {
        setRoomID((prev) => {
          const newVal = result?.roomID ?? undefined;
          if (prev !== newVal) {
            console.info("NEW ROOM ID", newVal);
          }
          return newVal;
        });
      },
    });
    const aliveIfVisible = () => {
      if (document.visibilityState === "visible") {
        void orchestratorR.mutate.alive(
          shareInfo
            ? {
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
  }, []);
  return roomID;
}

function useRoom(roomID: string | undefined) {
  const [room, setRoom] = useState<Room>();

  useEffect(() => {
    let room: Room;

    if (roomID === undefined) {
      room = {
        type: "share",
        r: new Reflect({
          roomID: "local",
          userID: "anon",
          mutators: shareMutators,
          server: undefined,
        }),
        fixedCells: {},
      };
    } else if (shareInfo !== undefined) {
      room = {
        type: "share",
        r: new Reflect({
          roomID,
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
          roomID,
          userID: "anon",
          mutators: playMutators,
          server: playServer,
        }),
      };
    }

    void room.r.mutate.initClient({ color: clientColor });
    if (room.type === "play") {
      void room.r.mutate.ensureOneCellEnabled();
    }
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
  }, [roomID]);

  return room;
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useLayoutEffect(() => {
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
  useLayoutEffect(() => {
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
  return Promise.resolve(url.toString());
};

const App: React.FC = () => {
  const roomID = useRoomID();
  const room = useRoom(roomID);

  const windowSize = useWindowSize();
  const [appRef, appRect] = useElementSize<HTMLDivElement>([windowSize]);
  const [docRect, setDocRect] = useState<Rect | null>(null);

  useEffect(() => {
    setDocRect(
      new Rect(0, 0, document.body.scrollWidth, document.body.scrollHeight)
    );
  }, [windowSize]);

  const createShareURL = () => {
    if (room === undefined || room.type === "share") {
      return createPlayURL();
    }
    return getShareURL(room.r);
  };

  return (
    <div className="App" ref={appRef}>
      <LoopLogo className="loopLogo" />
      <Grid room={room} />
      <Footer
        ctaText={shareInfo ? "Play" : "Share"}
        createCtaURL={shareInfo ? createPlayURL : createShareURL}
        reflectUrl="https://reflect.net"
      />
      {room && appRect && docRect ? (
        <CursorField r={room.r} appRect={appRect} docRect={docRect} />
      ) : null}
    </div>
  );
};

export default App;
