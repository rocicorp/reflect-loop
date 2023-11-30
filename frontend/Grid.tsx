import styles from "./Grid.module.css";
import { useEffect, useRef, useState, PointerEvent } from "react";
import {
  Cell,
  coordsToID,
  GRID_SIZE,
  idToCoords,
  indexToID,
  listCells,
  NUM_CELLS,
} from "../reflect/model/cell";
import { useSubscribe } from "replicache-react";
import { useSelfColor } from "../reflect/subscriptions";
import PresenceAvatars from "./PresenceBar";
import classNames from "classnames";
import { colorStringForColorID } from "../reflect/model/colors";
import { Room } from "./room";
import { ShareInfo } from "./share";
import { event } from "nextjs-google-analytics";

export const LOOP_LENGTH_MS = 8;

function getAlignedOffsetSeconds(nowMs: number) {
  return (nowMs / 1000) % LOOP_LENGTH_MS;
}

const EMPTY_CELLS: Record<string, Cell> = {};
let firstLogged = false;

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

function Grid({
  room,
  shareInfo,
  exclusive,
  onCellClick,
}: {
  room: Room | undefined;
  shareInfo: ShareInfo | undefined;
  exclusive: boolean;
  onCellClick: () => void;
}) {
  const selfColor = useSelfColor(room?.r);

  const [audioBuffersLoaded, setAudioBuffersLoaded] = useState<boolean>(false);
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);
  const [hoveredID, setHoveredID] = useState<string>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const audioBuffersRef = useRef<AudioBuffer[]>();
  const sourcesRef = useRef<Record<string, SourceNode>>({});

  useEffect(() => {
    const audioContext = new AudioContext();
    // always start of suspended til user clicks
    audioContext.suspend();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.connect(audioContext.destination);
    setAudioInitialized(audioContext.state === "running");
    const handler = () => {
      setAudioInitialized(audioContext.state === "running");
    };
    audioContext.addEventListener("statechange", handler);
    (async () => {
      const loadBuffers: () => Promise<AudioBuffer[]> = () =>
        Promise.all(
          audioSamples.map(async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return audioContext.decodeAudioData(arrayBuffer);
          })
        ).catch(loadBuffers);
      audioBuffersRef.current = await loadBuffers();
      setAudioBuffersLoaded(true);
    })();

    return () => {
      audioContext.removeEventListener("statechange", handler);
    };
  }, []);

  // This enables audio on click.
  useEffect(() => {
    if (audioInitialized) {
      return;
    }
    const handler = async () => {
      if (audioInitialized) {
        removeEventListeners();
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
  }, [audioInitialized]);

  const drawWaveform = () => {
    const audioContext = audioContextRef.current;
    const analyser = analyserRef.current;
    const audioBuffers = audioBuffersRef.current;
    const canvas = canvasRef.current;
    if (
      !audioContext ||
      audioContext.state !== "running" ||
      !analyser ||
      !audioBuffers ||
      !canvas
    ) {
      return;
    }
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext("2d")!;
    const width = canvas.width;
    const height = canvas.height;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "green");

    analyser.getByteTimeDomainData(dataArray);

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
        getAlignedOffsetSeconds(Date.now()) / audioBuffers[0].duration;
      const progressBarWidth = progress * width;
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
      canvasCtx.fillRect(0, 0, progressBarWidth, height);
    }
  };

  useEffect(() => {
    let done = false;
    const onFrame = () => {
      drawWaveform();
      if (done) {
        return;
      }
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledCellsFromSubscribe = useSubscribe(
    room?.r,
    async (tx) => {
      const cells = await listCells(tx);
      return Object.fromEntries(cells.map((c) => [c.id, c] as const));
    },
    undefined
  );

  const enabledCells =
    (room?.type === "share" ? room.fixedCells : enabledCellsFromSubscribe) ??
    shareInfo?.cells ??
    EMPTY_CELLS;

  useEffect(() => {
    const audioContext = audioContextRef.current;
    const analyser = analyserRef.current;
    const audioBuffers = audioBuffersRef.current;
    if (!audioInitialized || !audioContext || !analyser || !audioBuffers) {
      return;
    }

    const now = Date.now();
    const hoveredCoords =
      hoveredID === undefined ? undefined : idToCoords(hoveredID);
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const id = coordsToID(x, y);
        const source = sourcesRef.current[id];
        const active = source && source.playing;
        const shouldBeActive = id === hoveredID || id in enabledCells;
        const added = shouldBeActive && !active;
        const deleted = active && !shouldBeActive;
        const activeTargetGain = exclusive
          ? hoveredCoords === undefined
            ? 1
            : id === hoveredID
            ? 1
            : hoveredCoords[1] === y
            ? 0
            : 0.5
          : hoveredID === undefined
          ? 1
          : id === hoveredID
          ? 1
          : 0.5;
        if (active) {
          source.gain.setTargetAtTime(
            activeTargetGain,
            audioContext.currentTime,
            0.2
          );
        }
        if (added) {
          const source = new SourceNode(
            audioContext,
            audioBuffers[parseInt(id) % audioBuffers.length],
            analyser
          );
          const gain = source.gain;
          gain.setValueAtTime(0, 0);
          gain.setTargetAtTime(activeTargetGain, audioContext.currentTime, 0.2);
          source.start(0, getAlignedOffsetSeconds(now));

          sourcesRef.current[id] = source;
        }
        if (deleted) {
          const source = sourcesRef.current[id];
          source.gain.setTargetAtTime(0, audioContext.currentTime, 0.2);
          source.stop(audioContext.currentTime + 1);
          setTimeout(() => {
            source.disconnect();
          }, 5000);
          delete sourcesRef.current[id];
        }
      }
    }
  }, [
    audioBuffersLoaded,
    audioInitialized,
    enabledCells,
    hoveredID,
    exclusive,
  ]);

  const longPressTimeoutHandle = useRef<ReturnType<typeof setTimeout>>();

  function handleIfPlayRoom<R>(handler: R) {
    return room?.type === "play" ? handler : () => {};
  }

  const handleTouchStart = handleIfPlayRoom((id: string) => {
    if (longPressTimeoutHandle.current === undefined) {
      longPressTimeoutHandle.current = setTimeout(() => {
        setHoveredID(id);
        longPressTimeoutHandle.current = undefined;
      }, 300);
    }
  });

  const handleTouchEnd = handleIfPlayRoom(() => {
    setHoveredID(undefined);
    if (longPressTimeoutHandle.current !== undefined) {
      clearTimeout(longPressTimeoutHandle.current);
      longPressTimeoutHandle.current = undefined;
    }
  });

  const handlePointerOver = handleIfPlayRoom(
    (e: PointerEvent<HTMLDivElement>, id: string) => {
      if (e.pointerType === "touch") {
        return;
      }
      setHoveredID(id);
    }
  );

  const handlePointerOut = handleIfPlayRoom(
    (e: PointerEvent<HTMLDivElement>, id: string) => {
      if (e.pointerType === "touch") {
        return;
      }
      setHoveredID((existing) => (existing === id ? undefined : existing));
    }
  );

  const handleClick = handleIfPlayRoom((id: string) => {
    setHoveredID(undefined);
    if (room?.type === "play") {
      room.r.mutate.setCellEnabled({
        id,
        enabled: !(id in enabledCells),
        exclusive,
      });
      if (id in enabledCells) {
        event("toggle_cell_off", {
          category: "Grid",
          action: "toggle off",
          label: id,
        });
      } else {
        event("toggle_cell_on", {
          category: "Grid",
          action: "toggle on",
          label: id,
        });
      }
    }
  });

  return (
    <div className={styles.gridContainer}>
      <div className={styles.presenceOrMessageContainer}>
        <p
          className={classNames(styles.presenceOrMessage, {
            [styles.hidden]: audioInitialized,
          })}
        >
          Click or tap anywhere to start audio 🔊
        </p>
        <div
          className={classNames(styles.presenceOrMessage, {
            [styles.hidden]: !audioInitialized,
          })}
        >
          <PresenceAvatars r={room?.r} />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className={styles.waveform}
        width="444"
        height="64"
      ></canvas>
      <div className={styles.grid}>
        {new Array(NUM_CELLS).fill(null).map((_, i) => {
          const id = indexToID(i);
          return (
            <div
              key={id}
              id={id}
              className={classNames(styles.cell, {
                [styles.cellHovered]: id === hoveredID,
              })}
              style={
                enabledCells[id]
                  ? {
                      backgroundColor: colorStringForColorID(
                        enabledCells[id].color
                      ),
                    }
                  : {}
              }
              onPointerOver={(e) => {
                handlePointerOver?.(e, id);
              }}
              onPointerOut={(e) => {
                handlePointerOut?.(e, id);
              }}
              onTouchStart={() => handleTouchStart?.(id)}
              onTouchEnd={() => handleTouchEnd?.()}
              onClick={() => {
                onCellClick();
                handleClick?.(id);
              }}
            >
              <div
                className={styles.cellHighlight}
                style={
                  selfColor
                    ? { backgroundColor: colorStringForColorID(selfColor) }
                    : {}
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Grid;
