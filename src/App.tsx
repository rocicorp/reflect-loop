// src/App.tsx

import React from "react";
import "./App.css";
import Grid from "./Grid";
import LoopLogo from '../src/assets/loop-logo.svg?react'

const App: React.FC = () => {
  return (
    <div className="App">
      <LoopLogo
        className="loopLogo"
      />
      <Grid />
    </div>
  );
};

export default App;
