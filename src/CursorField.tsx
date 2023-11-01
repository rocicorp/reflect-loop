import { Reflect } from "@rocicorp/reflect/client";
import { useEffect } from "react";
import "./CursorField.css";
import { M } from "../reflect/mutators.js";
import { useClient } from "../reflect/subscriptions.js";
import { usePresence } from "@rocicorp/reflect/react";

export default function CursorField({ r }: { r: Reflect<M> }) {
  useEffect(() => {
    const handler = ({ pageX, pageY }: { pageX: number; pageY: number }) => {
      void r.mutate.updateCursor({
        x: pageX,
        y: pageY,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [r]);

  const clientStateIDs = usePresence(r);

  return (
    <>
      {clientStateIDs.map((id) => (
        <Cursor r={r} id={id} key={id} />
      ))}
    </>
  );
}

function Cursor({ r, id }: { r: Reflect<M>; id: string }) {
  const cs = useClient(r, id);
  if (!cs) return null;

  const { cursor, color, location } = cs;
  if (!cursor) return null;

  return (
    <div
      className="cursor"
      style={{
        transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
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
