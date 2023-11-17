import styles from "./Grid.module.css";
import { useEffect, useRef, useState, PointerEvent } from "react";
import {
  coordsToID,
  GRID_SIZE,
  indexToID,
  listCells,
  NUM_CELLS,
} from "../reflect/model/cell";
import { useSubscribe } from "replicache-react";
import { useSelfColor } from "../reflect/subscriptions";
import PresenceBar from "./PresenceBar";
import classNames from "classnames";
import { colorStringForColorID } from "../reflect/model/colors";
import { Room } from "./room";

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

function Grid({ room }: { room: Room | undefined }) {
  const selfColor = useSelfColor(room?.r);
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);
  const [hoveredID, setHoveredID] = useState<string | null>(null);
  const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[]>([]);
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();

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
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.connect(audioContext.destination);
    setAudioInitialized(audioContext.state === "running");
    const handler = () => {
      setAudioInitialized(audioContext.state === "running");
    };
    audioContext.addEventListener("statechange", handler);
    return () => {
      audioContext.removeEventListener("statechange", handler);
    };
  }, []);

  useEffect(() => {}, []);

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
    if (!audioContext || !analyser) {
      return;
    }
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
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
        (audioContext.currentTime % audioBuffers[0].duration) /
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

  const loadAudioSamples = async (audioContext: AudioContext) => {
    const buffers = await Promise.all(
      audioSamples.map(async (url) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return audioContext.decodeAudioData(arrayBuffer);
      })
    );
    setAudioBuffers(buffers);

    setRedrawTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const audioContext = audioContextRef.current;
    if (audioContext) {
      loadAudioSamples(audioContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioContextRef.current]);

  const enabledCellsFromSubscribe = useSubscribe(
    room?.r,
    async (tx) => {
      const cells = await listCells(tx);
      return Object.fromEntries(cells.map((c) => [c.id, c] as const));
    },
    {}
  );

  const enabledCells =
    room?.type === "share" ? room.fixedCells : enabledCellsFromSubscribe;

  const sources = useRef<Record<string, SourceNode>>({});

  useEffect(() => {
    const audioContext = audioContextRef.current;
    const analyser = analyserRef.current;
    if (!audioBuffers.length || !audioContext || !analyser) {
      return;
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const id = coordsToID(x, y);
        const source = sources.current[id];
        const active = source && source.playing;
        const shouldBeActive = id === hoveredID || id in enabledCells;
        const added = shouldBeActive && !active;
        const deleted = active && !shouldBeActive;
        const activeTargetGain =
          hoveredID === null ? 1 : id === hoveredID ? 1 : 0.5;
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
          source.start(0, audioContext.currentTime % audioBuffers[0].duration);

          sources.current[id] = source;
        }
        if (deleted) {
          const source = sources.current[id];
          source.gain.setTargetAtTime(0, audioContext.currentTime, 0.2);
          source.stop(audioContext.currentTime + 1);
          setTimeout(() => {
            source.disconnect();
          }, 5000);
          delete sources.current[id];
        }
      }
    }
  }, [audioBuffers, enabledCells, sources, hoveredID]);

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
    setHoveredID(null);
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
      setHoveredID((existing) => (existing === id ? null : existing));
    }
  );

  const handleClick = handleIfPlayRoom((id: string) => {
    setHoveredID(null);
    if (room?.type === "play") {
      room.r.mutate.setCellEnabled({ id, enabled: !(id in enabledCells) });
    }
  });

  return (
    <div>
      <div className={styles.presenceContainer}>
        <p
          className={classNames(styles.audioStartMessage, {
            [styles.hidden]: audioInitialized,
          })}
        >
          Click or tap anywhere to start audio 🔊
        </p>
        <div
          className={classNames(styles.presenceBarContainer, {
            [styles.hidden]: !audioInitialized,
          })}
        >
          <PresenceBar r={room?.r} />
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
              onClick={() => handleClick?.(id)}
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