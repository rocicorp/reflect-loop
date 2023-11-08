// src/App.tsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./App.css";
import Grid from "./Grid";
import Footer from "./Footer";
import LoopsLogo from "../src/assets/loops-logo.svg?react";
import { Reflect } from "@rocicorp/reflect/client";
import { M, mutators } from "../reflect/mutators";
import CursorField from "./CursorField";
import { Rect } from "./coordinates";

const r = new Reflect({
  roomID: "r1",
  userID: "anon",
  mutators,
  server: import.meta.env.VITE_REFLECT_SERVER ?? "http://127.0.0.1:8080/",
});
void r.mutate.initClient();

type Location = {
  country: string;
  city: string;
  region: string;
} | null;

function useEnsureLocation(r: Reflect<M> | null) {
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    void fetch("https://reflect.net/api/get-location")
      .then((resp) => resp.json())
      .then((data) => {
        setLocation(data);
      });
  }, []);

  useEffect(() => {
    if (r === null || location === null) {
      return;
    }
    const { country, city } = location;
    void r.mutate.updateLocation({ country, city });
  }, [location, r]);
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
  useEnsureLocation(r);
  const windowSize = useWindowSize();
  const [appRef, appRect] = useElementSize<HTMLDivElement>([windowSize]);
  const [docRect, setDocRect] = useState<Rect | null>(null);

  useEffect(() => {
    setDocRect(
      new Rect(0, 0, document.body.scrollWidth, document.body.scrollHeight)
    );
  }, [windowSize]);

  return (
    <div className="App" ref={appRef}>
      <LoopsLogo className="loopsLogo" />
      <Grid r={r} />
      <Footer shareUrl="https://reflect.net" reflectUrl="https://reflect.net" />
      {appRect && docRect ? (
        <CursorField r={r} appRect={appRect} docRect={docRect} />
      ) : null}
    </div>
  );
};

export default App;
