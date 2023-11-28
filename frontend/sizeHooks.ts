import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Rect } from "./coordinates";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useWindowSize() {
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

export function useElementSize<T extends Element>(deps: unknown[]) {
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
