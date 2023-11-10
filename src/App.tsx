import "./App.css";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import { getFixedCellInfo, getShareURL } from "./share";

const server = import.meta.env.VITE_REFLECT_SERVER ?? "http://127.0.0.1:8080/";

const fixedCellInfo = getFixedCellInfo();

function useRoomID() {
  const [roomID, setRoomID] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (fixedCellInfo) {
      setRoomID(fixedCellInfo.roomID);
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

function useReflect() {
  const [r, setR] = useState<Reflect<M> | undefined>(undefined);

  const roomID = useRoomID();
  useEffect(() => {
    if (!roomID) {
      return;
    }

    const reflect = new Reflect({
      roomID: "r1",
      userID: "anon",
      mutators,
      server,
    });
    void reflect.mutate.initClient();

    void fetch("https://reflect.net/api/get-location")
      .then((resp) => resp.json())
      .then((data) => {
        const { country, city } = data;
        void reflect.mutate.updateLocation({ country, city });
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

const App: React.FC = () => {
  const r = useReflect();
  const windowSize = useWindowSize();
  const [appRef, appRect] = useElementSize<HTMLDivElement>([windowSize]);
  const [docRect, setDocRect] = useState<Rect | null>(null);

  useEffect(() => {
    setDocRect(
      new Rect(0, 0, document.body.scrollWidth, document.body.scrollHeight)
    );
  }, [windowSize]);

  const createShareURL = useCallback(() => {
    return getShareURL(r);
  }, [r]);

  return (
    <div className="App" ref={appRef}>
      <LoopLogo className="loopLogo" />
      <Grid r={r} fixedCells={fixedCellInfo?.cells} />
      <Footer
        createShareURL={createShareURL}
        reflectUrl="https://reflect.net"
      />
      {appRect && docRect && r ? (
        <CursorField r={r} appRect={appRect} docRect={docRect} />
      ) : null}
    </div>
  );
};

export default App;
