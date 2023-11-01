import { Reflect } from "@rocicorp/reflect/client";
import { useEffect } from "react";
import "./CursorField.css";
import { M } from "../reflect/mutators.js";
import { useClient } from "../reflect/subscriptions.js";
import { usePresence } from "@rocicorp/reflect/react";
import {
  Rect,
  coordinateToPosition,
  positionToCoordinate,
} from "./coordinates.js";

export default function CursorField({
  r,
  appRect,
  docRect,
}: {
  r: Reflect<M>;
  appRect: Rect;
  docRect: Rect;
}) {
  useEffect(() => {
    const handler = ({ pageX, pageY }: { pageX: number; pageY: number }) => {
      const coordinate = positionToCoordinate(
        {
          x: pageX,
          y: pageY,
        },
        appRect,
        docRect
      );
      void r.mutate.updateCursor(coordinate);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [r, appRect, docRect]);

  const clientStateIDs = usePresence(r);

  return (
    <>
      {clientStateIDs.map((id) => (
        <Cursor r={r} id={id} key={id} appRect={appRect} docRect={docRect} />
      ))}
    </>
  );
}

function Cursor({
  r,
  id,
  appRect,
  docRect,
}: {
  r: Reflect<M>;
  id: string;
  appRect: Rect;
  docRect: Rect;
}) {
  const cs = useClient(r, id);
  if (!cs) return null;

  const { cursor, color, location } = cs;
  if (!cursor) return null;
  const cursorCoordinates = coordinateToPosition(cursor, appRect, docRect);

  return (
    <div
      className="cursor"
      style={{
        transform: `translate3d(${cursorCoordinates.x}px, ${cursorCoordinates.y}px, 0)`,
      }}
    >
      {
        <svg
          version="1.1"
          viewBox="0 0 20 22"
          x="0px"
          y="0px"
          width="20px"
          height="22px"
        >
          <path
            fill={color}
            stroke="#fff"
            d="M6.5,16.7l-3.3-16l14.2,8.2L10.5,11c-0.2,0.1-0.4,0.2-0.5,0.4L6.5,16.7z"
          />
        </svg>
      }
      <div
        className="location"
        style={{
          backgroundColor: color,
        }}
      >
        <div className="location-name">
          {location ??
            `Earth ${
              ["🌎", "🌍", "🌏"][Math.abs((id.codePointAt(0) ?? 0) % 3)]
            }`}
        </div>
      </div>
    </div>
  );
}
