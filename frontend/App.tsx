import styles from "./App.module.css";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Grid from "./Grid";
import Footer from "./Footer";
import { Reflect } from "@rocicorp/reflect/client";
import CursorField from "./CursorField";
import { Rect } from "./coordinates";
import { ShareInfo, getShareURL } from "./share";
import { getClientRoomAssignment } from "../reflect/model/orchestrator";
import { randomColorID } from "../reflect/model/colors";
import { getOrchstratorRoomID } from "../reflect/model/rooms";
import { shareMutators } from "../reflect/share/mutators";
import { playMutators } from "../reflect/play/mutators";
import { orchestratorMutators } from "../reflect/orchestrator/mutators";
import { Room } from "./room";

const orchestratorServer =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_SERVER ?? "http://127.0.0.1:8080/";
const playServer =
  process.env.NEXT_PUBLIC_PLAY_SERVER ?? "http://127.0.0.1:8080/";
const shareServer =
  process.env.NEXT_PUBLIC_SHARE_SERVER ?? "http://127.0.0.1:8080/";

const clientColor = randomColorID();

function useRoomID(shareInfo: ShareInfo | undefined) {
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
  }, [shareInfo]);
  return roomID;
}

function useRoom(shareInfo: ShareInfo | undefined, roomID: string | undefined) {
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
  }, [shareInfo, roomID]);

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
  return Promise.resolve(url.toString());
};

const App = ({ shareInfo }: { shareInfo: ShareInfo | undefined }) => {
  const roomID = useRoomID(shareInfo);
  const room = useRoom(shareInfo, roomID);

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
    <div className={styles.app} ref={appRef}>
      <LoopLogo />
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

function LoopLogo() {
  return (
    <svg
      width="176"
      height="48"
      viewBox="0 0 176 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.loopLogo}
    >
      <path
        d="M87.4182 36.2101C89.0614 38.0539 90.8047 39.8255 92.7083 41.4128C94.7122 43.0762 96.8283 44.6274 99.1928 45.7417C101.806 46.9762 104.451 47.7458 107.349 47.9542C109.693 48.1225 112.138 47.8139 114.41 47.2407C123.187 45.0161 130.409 37.4927 131.972 28.5225C132.381 26.1497 132.541 23.7528 132.244 21.3558C132.076 20.0532 131.884 18.7585 131.523 17.4879C131.17 16.2534 130.689 15.0629 130.168 13.8885C128.365 9.80812 125.231 6.37314 121.544 3.90802C117.716 1.35076 113.015 0 108.431 0C103.87 0.00801593 99.4454 1.70354 95.7343 4.29681C92.0071 6.9102 88.8289 10.1568 85.9153 13.636C83.1901 16.9027 80.6051 20.2977 78.0281 23.6967C77.427 24.4903 76.8338 25.2678 76.2247 26.0535C76.4331 25.781 76.6455 25.5124 76.8579 25.2439C73.7198 29.3283 70.3854 33.3244 66.318 36.491C66.5905 36.2826 66.8591 36.0701 67.1276 35.8577C65.4364 37.1723 63.6088 38.3107 61.637 39.1524C61.9576 39.0241 62.2782 38.8799 62.5988 38.7516C61.1641 39.3528 59.6811 39.7857 58.1422 39.9861C58.4949 39.938 58.8555 39.8859 59.2043 39.8458C57.6613 40.0462 56.0983 40.0061 54.5554 39.8057C54.908 39.8538 55.2687 39.9059 55.6174 39.946C53.8741 39.7055 52.1708 39.2566 50.5477 38.5752C50.8683 38.7035 51.1889 38.8478 51.5095 38.9761C49.9264 38.3027 48.4316 37.4449 47.069 36.4028C47.3415 36.6112 47.61 36.8237 47.8786 37.0361C46.4958 35.9619 45.2535 34.7194 44.1834 33.3405C44.3918 33.613 44.6042 33.8816 44.8166 34.1501C43.7746 32.7794 42.9009 31.2963 42.2437 29.7091C42.3719 30.0297 42.5162 30.3504 42.6444 30.671C41.9711 29.0477 41.5142 27.3442 41.2738 25.6006C41.3219 25.9534 41.374 26.3141 41.4141 26.6629C41.1857 24.9073 41.1857 23.1356 41.4141 21.3721C41.366 21.7248 41.3139 22.0855 41.2738 22.4343C41.5143 20.6907 41.9632 18.9872 42.6444 17.3639C42.5162 17.6845 42.3719 18.0052 42.2437 18.3259C42.917 16.7426 43.7746 15.2475 44.8166 13.8848C44.6082 14.1573 44.3958 14.4259 44.1834 14.6944C45.2575 13.3116 46.4998 12.069 47.8786 10.9988C47.606 11.2072 47.3375 11.4197 47.069 11.6321C48.4396 10.59 49.9224 9.71617 51.5095 9.05885C51.1889 9.18711 50.8683 9.3314 50.5477 9.45966C52.1708 8.78628 53.8741 8.32931 55.6174 8.08889C55.2648 8.13699 54.9041 8.1891 54.5554 8.22918C56.0983 8.02878 57.6613 7.98869 59.2043 8.1891C58.8516 8.141 58.4909 8.08889 58.1422 8.04881C59.6571 8.25723 61.1159 8.67009 62.5306 9.25931C62.21 9.13105 61.8894 8.98675 61.5687 8.85849C63.4924 9.68017 65.2759 10.7904 66.9311 12.0651C66.6586 11.8566 66.3901 11.6442 66.1215 11.4318C68.426 13.2154 70.49 15.2877 72.4217 17.4761C73.0829 18.2177 74.2853 18.6465 75.2591 18.6465C76.241 18.6465 77.4153 18.2056 78.0966 17.4761C79.6395 15.8007 79.5874 13.488 78.0966 11.8045C74.8904 8.19718 71.2113 4.70996 66.8744 2.51348C65.6641 1.90423 64.3896 1.35911 63.0871 0.950313C61.7726 0.529445 60.4219 0.31701 59.0513 0.156681C56.7349 -0.115873 54.3423 0.136641 52.0779 0.597589C43.4933 2.36926 36.3876 9.24734 34.075 17.6648C31.7025 26.2103 34.4037 35.8504 41.0885 41.7824C44.3227 44.6603 48.3225 46.7846 52.599 47.5462C53.8814 47.7747 55.1839 47.947 56.4865 47.9871C57.761 48.0272 59.0033 47.8989 60.2658 47.7266C62.422 47.4259 64.4418 46.6844 66.4176 45.7625C68.4416 44.8085 70.2331 43.5259 71.9884 42.1631C73.6115 40.9005 75.1145 39.5097 76.5252 38.0267C79.4709 34.9604 82.0638 31.5734 84.6409 28.1865C85.1819 27.4651 85.723 26.7516 86.2761 26.0301C86.0677 26.3026 85.8552 26.5712 85.6428 26.8397C88.9493 22.6311 92.1353 18.2942 95.9632 14.5265C97.0773 13.4363 98.2396 12.3941 99.4699 11.4322C99.1974 11.6406 98.9289 11.853 98.6604 12.0655C100.312 10.7908 102.087 9.6806 103.999 8.85089C103.678 8.97915 103.357 9.12344 103.037 9.2517C104.46 8.65047 105.942 8.2176 107.477 8.0172C107.125 8.0653 106.764 8.1174 106.415 8.15749C107.958 7.95708 109.521 7.99716 111.064 8.19757C110.711 8.14947 110.351 8.09736 110.002 8.05728C111.745 8.29778 113.449 8.7467 115.072 9.42805C114.751 9.29979 114.431 9.1555 114.11 9.02723C115.693 9.70062 117.188 10.5584 118.55 11.6005C118.278 11.3921 118.009 11.1796 117.741 10.9672C119.124 12.0414 120.366 13.2839 121.436 14.6628C121.228 14.3903 121.015 14.1217 120.803 13.8532C121.845 15.2239 122.719 16.707 123.376 18.2942C123.248 17.9736 123.103 17.6529 122.975 17.3323C123.648 18.9556 124.105 20.6591 124.346 22.4027C124.298 22.0499 124.245 21.6892 124.205 21.3404C124.434 23.096 124.434 24.8677 124.205 26.6312C124.253 26.2785 124.306 25.9178 124.346 25.569C124.105 27.3126 123.656 29.0161 122.975 30.6394C123.103 30.3188 123.248 29.9981 123.376 29.6774C122.703 31.2607 121.845 32.7558 120.803 34.1185C121.011 33.846 121.224 33.5774 121.436 33.3089C120.362 34.6917 119.12 35.9343 117.741 37.0045C118.013 36.7961 118.282 36.5836 118.55 36.3712C117.18 37.4133 115.697 38.2871 114.11 38.9444C114.431 38.8162 114.751 38.6719 115.072 38.5436C113.449 39.217 111.745 39.674 110.002 39.9144C110.355 39.8663 110.715 39.8142 111.064 39.7741C109.521 39.9745 107.97 40.0146 106.423 39.8142C106.776 39.8623 107.137 39.9144 107.485 39.9545C105.922 39.7461 104.407 39.3052 102.965 38.6919C103.285 38.8201 103.606 38.9644 103.927 39.0927C102.003 38.259 100.231 37.1487 98.5642 35.8781C98.8367 36.0865 99.1052 36.299 99.3737 36.5114C97.0693 34.7277 95.0053 32.6755 93.0816 30.499C92.4203 29.7575 91.218 29.3287 90.2441 29.3287C89.2623 29.3287 88.088 29.7696 87.4067 30.499C85.8877 32.2226 85.9273 34.5387 87.4182 36.2101Z"
        fill="white"
      />
      <path
        d="M0 48V0H8.86557V43.7333L4.99938 39.9333H31.7294V48H0Z"
        fill="white"
      />
      <path
        d="M137.938 48V0H159.869C163.157 0 166.001 0.622222 168.401 1.86667C170.801 3.11111 172.667 4.84444 174 7.06667C175.333 9.24445 176 11.7778 176 14.6667C176 17.6 175.333 20.1778 174 22.4C172.667 24.6222 170.778 26.3556 168.334 27.6C165.89 28.8 162.979 29.4 159.602 29.4H144.204V21.5333H159.202C161.557 21.5333 163.424 20.9556 164.801 19.8C166.179 18.6 166.868 16.9111 166.868 14.7333C166.868 12.4667 166.201 10.7556 164.868 9.6C163.535 8.44444 161.713 7.86666 159.402 7.86666H144.271L146.804 6V48H137.938Z"
        fill="white"
      />
    </svg>
  );
}

export default App;
