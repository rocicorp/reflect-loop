import "./App.css";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Grid from "./Grid";
import Footer from "./Footer";
import LoopLogo from "../src/assets/loop-logo.svg?react";
import { Reflect } from "@rocicorp/reflect/client";
import { M, mutators } from "../reflect/mutators";
import CursorField from "./CursorField";
import { Rect } from "./coordinates";
import {
  ORCHESTRATOR_ROOM,
  getClientRoomAssignment,
} from "../reflect/model/orchestrator";
import { getShareInfo, getShareURL } from "./share";
import { randomColorID } from "../reflect/model/colors";

const server = import.meta.env.VITE_REFLECT_SERVER ?? "http://127.0.0.1:8080/";

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
    if (shareInfo) {
      setRoomID(shareInfo.roomID);
      return;
    }
    const orchestratorR = new Reflect<M>({
      server,
      userID: "anon",
      roomID: ORCHESTRATOR_ROOM,
      mutators,
    });

    orchestratorR.onUpdateNeeded = (reason) => {
      if (reason.type !== "NewClientGroup") {
        location.reload();
      }
    };

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
        void orchestratorR.mutate.alive();
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

function useReflect(roomID: string | undefined) {
  const [r, setR] = useState<Reflect<M> | undefined>(undefined);

  useEffect(() => {
    const reflect = new Reflect({
      roomID: roomID ?? "local",
      userID: "anon",
      mutators,
      server: roomID ? server : undefined,
    });
    void reflect.mutate.initClient({
      color: clientColor,
    });
    clientLocation.then((loc) => {
      if (loc) {
        void reflect.mutate.updateLocation(loc);
      }
    });

    setR(reflect);
    return () => {
      setR(undefined);
      void reflect.close();
    };
  }, [roomID]);

  return r;
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
  const r = useReflect(roomID);

  const windowSize = useWindowSize();
  const [appRef, appRect] = useElementSize<HTMLDivElement>([windowSize]);
  const [docRect, setDocRect] = useState<Rect | null>(null);

  useEffect(() => {
    setDocRect(
      new Rect(0, 0, document.body.scrollWidth, document.body.scrollHeight)
    );
  }, [windowSize]);

  const createShareURL = () => {
    return getShareURL(r);
  };

  return (
    <div className="App" ref={appRef}>
      <LoopLogo className="loopLogo" />
      <Grid r={r} fixedCells={roomID ? shareInfo?.cells : {}} />
      <Footer
        ctaText={shareInfo ? "Play" : "Share"}
        createCtaURL={shareInfo ? createPlayURL : createShareURL}
        reflectUrl="https://reflect.net"
      />
      {appRect && docRect && r ? (
        <CursorField r={r} appRect={appRect} docRect={docRect} />
      ) : null}
    </div>
  );
};

export default App;
