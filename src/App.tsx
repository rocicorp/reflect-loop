// src/App.tsx

import React, { useEffect, useState } from "react";
import "./App.css";
import Grid from "./Grid";
import LoopLogo from "../src/assets/loop-logo.svg?react";
import { Reflect } from "@rocicorp/reflect/client";
import { M, mutators } from "../reflect/mutators";
import CursorField from "./CursorField";

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
  });

  useEffect(() => {
    if (r === null || location === null) {
      return;
    }
    const { country, city } = location;
    const flagEmoji = String.fromCodePoint(
      ...country
        .toUpperCase()
        .split("")
        .map((char: string) => 127397 + char.charCodeAt(0))
    );
    void r.mutate.updateLocation({
      location: `${decodeURI(city)} ${flagEmoji}`,
    });
  }, [location, r]);
}

const App: React.FC = () => {
  useEnsureLocation(r);
  return (
    <div className="App">
      <LoopLogo className="loopLogo" />
      <Grid r={r} />
      <CursorField r={r} />
    </div>
  );
};

export default App;
