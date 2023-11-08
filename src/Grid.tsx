import { useEffect, useRef, useState, PointerEvent } from "react";
import "./Grid.css";
import {
  coordsToID,
  gridSize,
  indexToID,
  listCells,
  numCells,
} from "../reflect/model/cell";
import { useSubscribe } from "replicache-react";
import { Reflect } from "@rocicorp/reflect/client";
import { M } from "../reflect/mutators.js";
import { useSelfColor } from "../reflect/subscriptions.js";
import PresenceBar from "./PresenceBar.js";
import classNames from "classnames";

class SourceNode {
  #audioBufferSourceNode: AudioBufferSourceNode;
  #gainNode: GainNode;
  #playing: boolean = false;

  constructor(
    context: AudioContext,
    buffer: AudioBuffer,
    destination: AudioNode
  ) {
    this.#audioBufferSourceNode = context.createBufferSource();
    this.#audioBufferSourceNode.buffer = buffer;
    this.#audioBufferSourceNode.loop = true;
    this.#gainNode = context.createGain();
    this.#audioBufferSourceNode.connect(this.#gainNode);
    this.#gainNode.connect(destination);
  }

  get playing() {
    return this.#playing;
  }

  get gain() {
    return this.#gainNode.gain;
  }

  start(when?: number, offset?: number) {
    this.#playing = true;
    this.#audioBufferSourceNode.start(when, offset);
  }

  stop(when?: number) {
    this.#playing = false;
    this.#audioBufferSourceNode.stop(when);
  }

  disconnect() {
    this.#gainNode.disconnect();
    this.#audioBufferSourceNode.disconnect();
  }
}

function Grid({ r }: { r: Reflect<M> }) {
  const selfColor = useSelfColor(r);
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);
  const [hoveredID, setHoveredID] = useState<string | null>(null);
  const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[]>([]);
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef(new window.AudioContext());
  const analyserRef = useRef<AnalyserNode>(
    audioContextRef.current.createAnalyser()
  );

  const bufferLength = analyserRef.current.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const audioSamples = [
    "/samples/row-1-sample-1.mp3",
    "/samples/row-1-sample-2.mp3",
    "/samples/row-1-sample-3.mp3",
    "/samples/row-1-sample-4.mp3",
    "/samples/row-1-sample-5.mp3",
    "/samples/row-1-sample-6.mp3",
    "/samples/row-1-sample-7.mp3",
    "/samples/row-1-sample-8.mp3",
    "/samples/row-2-sample-1.mp3",
    "/samples/row-2-sample-2.mp3",
    "/samples/row-2-sample-3.mp3",
    "/samples/row-2-sample-4.mp3",
    "/samples/row-2-sample-5.mp3",
    "/samples/row-2-sample-6.mp3",
    "/samples/row-2-sample-7.mp3",
    "/samples/row-2-sample-8.mp3",
    "/samples/row-3-sample-1.mp3",
    "/samples/row-3-sample-2.mp3",
    "/samples/row-3-sample-3.mp3",
    "/samples/row-3-sample-4.mp3",
    "/samples/row-3-sample-5.mp3",
    "/samples/row-3-sample-6.mp3",
    "/samples/row-3-sample-7.mp3",
    "/samples/row-3-sample-8.mp3",
    "/samples/row-4-sample-1.mp3",
    "/samples/row-4-sample-2.mp3",
    "/samples/row-4-sample-3.mp3",
    "/samples/row-4-sample-4.mp3",
    "/samples/row-4-sample-5.mp3",
    "/samples/row-4-sample-6.mp3",
    "/samples/row-4-sample-7.mp3",
    "/samples/row-4-sample-8.mp3",
    "/samples/row-5-sample-1.mp3",
    "/samples/row-5-sample-2.mp3",
    "/samples/row-5-sample-3.mp3",
    "/samples/row-5-sample-4.mp3",
    "/samples/row-5-sample-5.mp3",
    "/samples/row-5-sample-6.mp3",
    "/samples/row-5-sample-7.mp3",
    "/samples/row-5-sample-8.mp3",
    "/samples/row-6-sample-1.mp3",
    "/samples/row-6-sample-2.mp3",
    "/samples/row-6-sample-3.mp3",
    "/samples/row-6-sample-4.mp3",
    "/samples/row-6-sample-5.mp3",
    "/samples/row-6-sample-6.mp3",
    "/samples/row-6-sample-7.mp3",
    "/samples/row-6-sample-8.mp3",
    "/samples/row-7-sample-1.mp3",
    "/samples/row-7-sample-2.mp3",
    "/samples/row-7-sample-3.mp3",
    "/samples/row-7-sample-4.mp3",
    "/samples/row-7-sample-5.mp3",
    "/samples/row-7-sample-6.mp3",
    "/samples/row-7-sample-7.mp3",
    "/samples/row-7-sample-8.mp3",
    "/samples/row-8-sample-1.mp3",
    "/samples/row-8-sample-2.mp3",
    "/samples/row-8-sample-3.mp3",
    "/samples/row-8-sample-4.mp3",
    "/samples/row-8-sample-5.mp3",
    "/samples/row-8-sample-6.mp3",
    "/samples/row-8-sample-7.mp3",
    "/samples/row-8-sample-8.mp3",
  ];

  useEffect(() => {
    analyserRef.current.connect(audioContextRef.current.destination);
  }, []);

  // This enable audio on click.
  // TODO: Add a play button overload so users know they need to click
  useEffect(() => {
    let audioInitialized = false;
    const handler = async () => {
      if (audioInitialized) {
        return;
      }
      const audioContext = audioContextRef.current;
      if (!audioContext) {
        return;
      }

      const buffer = audioContext.createBuffer(1, 1, 22050); // 1/10th of a second of silence
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();

      const silenceDataURL =
        "data:audio/mp3;base64,//MkxAAHiAICWABElBeKPL/RANb2w+yiT1g/gTok//lP/W/l3h8QO/OCdCqCW2Cw//MkxAQHkAIWUAhEmAQXWUOFW2dxPu//9mr60ElY5sseQ+xxesmHKtZr7bsqqX2L//MkxAgFwAYiQAhEAC2hq22d3///9FTV6tA36JdgBJoOGgc+7qvqej5Zu7/7uI9l//MkxBQHAAYi8AhEAO193vt9KGOq+6qcT7hhfN5FTInmwk8RkqKImTM55pRQHQSq//MkxBsGkgoIAABHhTACIJLf99nVI///yuW1uBqWfEu7CgNPWGpUadBmZ////4sL//MkxCMHMAH9iABEmAsKioqKigsLCwtVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVV//MkxCkECAUYCAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
      const tag = document.createElement("audio");
      tag.controls = false;
      tag.preload = "auto";
      tag.loop = true;
      tag.src = silenceDataURL;
      try {
        await tag.play();
      } catch (e) {
        console.error("Failed to start audio tag", e);
      }
      try {
        await audioContext.resume();
        audioInitialized = true;
        setAudioInitialized(true);
        removeEventListeners();
      } catch (e) {
        console.error("Failed to start audio context", e);
      }
    };
    const removeEventListeners = () => {
      window.document.documentElement.removeEventListener(
        "click",
        handler,
        false
      );
    };
    window.document.documentElement.addEventListener("click", handler, false);
    return removeEventListeners;
  }, []);

  const drawWaveform = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d")!;
    const width = canvas.width;
    const height = canvas.height;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "green");

    analyserRef.current.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(0, 0, 0)";
    canvasCtx.fillRect(0, 0, width, height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = gradient;
    canvasCtx.beginPath();

    const sliceWidth = (width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();

    // Loop progress bar
    if (audioBuffers.length > 0 && audioBuffers[0].duration) {
      const progress =
        (audioContextRef.current.currentTime % audioBuffers[0].duration) /
        audioBuffers[0].duration;
      const progressBarWidth = progress * width;
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
      canvasCtx.fillRect(0, 0, progressBarWidth, height);
    }

    requestAnimationFrame(drawWaveform);
  };

  useEffect(() => {
    drawWaveform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current, redrawTrigger]);

  const loadAudioSamples = async () => {
    const buffers = await Promise.all(
      audioSamples.map(async (url) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return audioContextRef.current.decodeAudioData(arrayBuffer);
      })
    );
    setAudioBuffers(buffers);

    setRedrawTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    loadAudioSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledCells = useSubscribe(
    r,
    async (tx) => {
      const cells = await listCells(tx);
      return Object.fromEntries(cells.map((c) => [c.id, c] as const));
    },
    {}
  );

  const sources = useRef<Record<string, SourceNode>>({});

  useEffect(() => {
    if (!audioBuffers.length) {
      return;
    }

    // loop through each row
    // if there is an add, add it and set to play at same time, and set any deletes to stop at that time too
    // else if there is a delete just stop it

    const audioCtx = audioContextRef.current;
    for (let y = 0; y < gridSize; y++) {
      const adds: string[] = [];
      const dels: string[] = [];
      for (let x = 0; x < gridSize; x++) {
        const id = coordsToID(x, y);
        const source = sources.current[id];
        const active = source && source.playing;
        const shouldBeActive = id === hoveredID || id in enabledCells;
        const added = shouldBeActive && !active;
        const deleted = active && !shouldBeActive;
        if (added) {
          adds.push(id);
        }
        if (deleted) {
          dels.push(id);
        }
      }
      for (const id of adds) {
        const source = new SourceNode(
          audioCtx,
          audioBuffers[parseInt(id) % audioBuffers.length],
          analyserRef.current
        );
        const gain = source.gain;

        // connect the AudioBufferSourceNode to the gainNode
        // and the gainNode to the destination
        gain.setValueAtTime(0, 0);
        gain.setTargetAtTime(1, audioCtx.currentTime, 0.2);
        source.start(0, audioCtx.currentTime % audioBuffers[0].duration);

        sources.current[id] = source;
      }
      for (const id of dels) {
        const source = sources.current[id];
        source.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        source.stop(audioCtx.currentTime + 1);
        setTimeout(() => {
          source.disconnect();
        }, 5000);
        delete sources.current[id];
      }
    }
  }, [audioBuffers, enabledCells, sources, hoveredID]);

  const longPressTimeoutHandle = useRef<ReturnType<typeof setTimeout>>();
  const handleTouchStart = (id: string) => {
    if (longPressTimeoutHandle.current === undefined) {
      longPressTimeoutHandle.current = setTimeout(() => {
        setHoveredID(id);
        longPressTimeoutHandle.current = undefined;
      }, 300);
    }
  };

  const handleTouchEnd = () => {
    setHoveredID(null);
    if (longPressTimeoutHandle.current !== undefined) {
      clearTimeout(longPressTimeoutHandle.current);
      longPressTimeoutHandle.current = undefined;
    }
  };

  const handlePointerOver = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (e.pointerType === "touch") {
      return;
    }
    setHoveredID(id);
  };

  const handlePointerOut = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (e.pointerType === "touch") {
      return;
    }
    setHoveredID((existing) => (existing === id ? null : existing));
  };

  return (
    <div>
      <p className={`audioStartMessage ${audioInitialized ? "hidden" : ""}`}>
        Click or tap anywhere to start audio 🔊
      </p>
      <div className="presenceContainer">
        <PresenceBar r={r} />
      </div>
      <canvas
        ref={canvasRef}
        className="waveform"
        width="444"
        height="64"
      ></canvas>
      <div className="grid">
        {new Array(numCells).fill(null).map((_, i) => {
          const id = indexToID(i);
          return (
            <div
              key={id}
              id={id}
              className={classNames("cell", {
                "cell-hovered": id === hoveredID,
              })}
              style={
                enabledCells[id]
                  ? { backgroundColor: enabledCells[id].color }
                  : {}
              }
              onPointerOver={(e) => {
                handlePointerOver(e, id);
              }}
              onPointerOut={(e) => {
                handlePointerOut(e, id);
              }}
              onTouchStart={() => handleTouchStart(id)}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                r.mutate.setCellEnabled({
                  id,
                  enabled: !(id in enabledCells),
                });
                setHoveredID(null);
              }}
            >
              <div
                className="cellHighlight"
                style={selfColor ? { backgroundColor: selfColor } : {}}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Grid;
