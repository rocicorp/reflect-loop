import styles from "./CursorField.module.css";
import { Reflect } from "@rocicorp/reflect/client";
import { useEffect } from "react";
import { usePresentClients } from "../reflect/subscriptions";
import {
  Rect,
  coordinateToPosition,
  positionToCoordinate,
} from "./coordinates";
import { displayStringForLocation } from "./location";
import { Client } from "../reflect/model/client";
import { ClientID } from "@rocicorp/reflect";
import classNames from "classnames";
import { colorStringForColorID } from "../reflect/model/colors";
import { SHARE_M } from "../reflect/share/mutators";

export default function CursorField({
  r,
  appRect,
  docRect,
}: {
  r: Reflect<SHARE_M>;
  appRect: Rect;
  docRect: Rect;
}) {
  useEffect(() => {
    const mouseMoveHandler = ({
      pageX,
      pageY,
    }: {
      pageX: number;
      pageY: number;
    }) => {
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
    const touchHandler = () => {
      void r.mutate.markAsTouchClient();
      window.removeEventListener("touchstart", touchHandler);
    };
    window.addEventListener("touchstart", touchHandler);
    window.addEventListener("mousemove", mouseMoveHandler);
    return () => {
      window.removeEventListener("touchstart", touchHandler);
      window.removeEventListener("mousemove", mouseMoveHandler);
    };
  }, [r, appRect, docRect]);

  const presentClients = usePresentClients(r);
  return (
    <div className={styles.cursorField}>
      {presentClients.map((client) => (
        <Cursor
          selfClientID={r.clientID}
          client={client}
          key={client.clientID}
          appRect={appRect}
          docRect={docRect}
        />
      ))}
    </div>
  );
}

function Cursor({
  selfClientID,
  client,
  appRect,
  docRect,
}: {
  selfClientID: ClientID;
  client: Client;
  appRect: Rect;
  docRect: Rect;
}) {
  const { cursor, color, location } = client;

  if (!cursor) return null;
  const colorString = colorStringForColorID(color);
  const cursorCoordinates = coordinateToPosition(cursor, appRect, docRect);
  return (
    <div
      className={classNames(styles.cursor, {
        [styles.cursorSelf]: client.clientID === selfClientID,
        [styles.cursorTouch]: client.isTouch,
      })}
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
            fill={colorString}
            stroke="#fff"
            d="M6.5,16.7l-3.3-16l14.2,8.2L10.5,11c-0.2,0.1-0.4,0.2-0.5,0.4L6.5,16.7z"
          />
        </svg>
      }
      <div
        className={styles.location}
        style={{
          backgroundColor: colorString,
        }}
      >
        <div className={styles.locationName}>
          {displayStringForLocation(location)}
        </div>
      </div>
    </div>
  );
}
