import { useEffect, useReducer, useRef, useState } from "react";
import "./Grid.css";
import { Reflect } from "@rocicorp/reflect/client";
import { mutators } from "../reflect/mutators";
import { coordsToID, gridSize, indexToID, listCells, numCells } from "./cell";
import classnames from "classnames";
import { useSubscribe } from "replicache-react";

function calculateNextStartTime(
  sampleDuration: number,
  audioContext: AudioContext
) {
  if (audioContext.currentTime === 0) {
    return audioContext.currentTime;
  }

  const nextQuantizedTime =
    Math.ceil(audioContext.currentTime / sampleDuration) * sampleDuration;
  return nextQuantizedTime;
}

const r = new Reflect({
  roomID: "r1",
  userID: "anon",
  mutators,
  server: import.meta.env.VITE_REFLECT_SERVER ?? "http://127.0.0.1:8080/",
});

enum SourceState {
  Unqueued = -1,
  Queued = 0,
  Playing = 1,
  Stopping = 2,
  Stopped = 3,
}

class SourceNode extends AudioBufferSourceNode {
  #timerID: number | null = null;
  #state: SourceState;

  constructor(context: AudioContext, buffer: AudioBuffer) {
    super(context, { buffer });
    this.#state = SourceState.Unqueued;
  }

  get state() {
    return this.#state;
  }

  start(when?: number) {
    if (this.#state !== SourceState.Unqueued) {
      throw new Error("Cannot start already started node");
    }

    this.#state = SourceState.Queued;
    super.start(when);

    const delta = when ? when - this.context.currentTime : 0;
    this.#timerID = window.setTimeout(() => {
      this.#state = SourceState.Playing;
      this.dispatchEvent(new Event("started"));
    }, delta * 1000);
  }

  stop(when?: number) {
    if (
      this.#state !== SourceState.Queued &&
      this.#state !== SourceState.Playing
    ) {
      throw new Error("Cannot stop unqueued or stopped node");
    }

    if (this.#timerID !== null) {
      window.clearTimeout(this.#timerID);
      this.#timerID = null;
    }

    this.#state = SourceState.Stopping;
    super.stop(when);
    const delta = when ? when - this.context.currentTime : 0;
    this.#timerID = window.setTimeout(() => {
      this.#state = SourceState.Stopped;
      this.dispatchEvent(new Event("stopped"));
    }, delta * 1000);
  }
}

function Grid() {
  const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[]>([]);
  const [, onSourceNodeChange] = useReducer((x) => x + 1, 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const audioContextRef = useRef(new window.AudioContext());
  const analyserRef = useRef<AnalyserNode>(
    audioContextRef.current.createAnalyser()
  );

  const bufferLength = analyserRef.current.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const audioSamples = [
    '/samples/row-1-sample-1.wav',
    '/samples/row-1-sample-2.wav',
    '/samples/row-1-sample-3.wav',
    '/samples/row-1-sample-4.wav',
    '/samples/row-1-sample-5.wav',
    '/samples/row-1-sample-6.wav',
    '/samples/row-1-sample-7.wav',
    '/samples/row-1-sample-8.wav',
    '/samples/row-2-sample-1.wav',
    '/samples/row-2-sample-2.wav',
    '/samples/row-2-sample-3.wav',
    '/samples/row-2-sample-4.wav',
    '/samples/row-2-sample-5.wav',
    '/samples/row-2-sample-6.wav',
    '/samples/row-2-sample-7.wav',
    '/samples/row-2-sample-8.wav',
    '/samples/row-3-sample-1.wav',
    '/samples/row-3-sample-2.wav',
    '/samples/row-3-sample-3.wav',
    '/samples/row-3-sample-4.wav',
    '/samples/row-3-sample-5.wav',
    '/samples/row-3-sample-6.wav',
    '/samples/row-3-sample-7.wav',
    '/samples/row-3-sample-8.wav',
    '/samples/row-4-sample-1.wav',
    '/samples/row-4-sample-2.wav',
    '/samples/row-4-sample-3.wav',
    '/samples/row-4-sample-4.wav',
    '/samples/row-4-sample-5.wav',
    '/samples/row-4-sample-6.wav',
    '/samples/row-4-sample-7.wav',
    '/samples/row-4-sample-8.wav',
    '/samples/row-5-sample-1.wav',
    '/samples/row-5-sample-2.wav',
    '/samples/row-5-sample-3.wav',
    '/samples/row-5-sample-4.wav',
    '/samples/row-5-sample-5.wav',
    '/samples/row-5-sample-6.wav',
    '/samples/row-5-sample-7.wav',
    '/samples/row-5-sample-8.wav',
    '/samples/row-6-sample-1.wav',
    '/samples/row-6-sample-2.wav',
    '/samples/row-6-sample-3.wav',
    '/samples/row-6-sample-4.wav',
    '/samples/row-6-sample-5.wav',
    '/samples/row-6-sample-6.wav',
    '/samples/row-6-sample-7.wav',
    '/samples/row-6-sample-8.wav',
    '/samples/row-7-sample-1.wav',
    '/samples/row-7-sample-2.wav',
    '/samples/row-7-sample-3.wav',
    '/samples/row-7-sample-4.wav',
    '/samples/row-7-sample-5.wav',
    '/samples/row-7-sample-6.wav',
    '/samples/row-7-sample-7.wav',
    '/samples/row-7-sample-8.wav',
    '/samples/row-8-sample-1.wav',
    '/samples/row-8-sample-2.wav',
    '/samples/row-8-sample-3.wav',
    '/samples/row-8-sample-4.wav',
    '/samples/row-8-sample-5.wav',
    '/samples/row-8-sample-6.wav',
    '/samples/row-8-sample-7.wav',
    '/samples/row-8-sample-8.wav'
  ];

  // This enable audio on click.
  // TODO: Add a play button overload so users know they need to click
  useEffect(() => {
    const handler = () => audioContextRef.current?.resume();
    window.addEventListener("click", handler, false);
    return () => window.removeEventListener("click", handler, false);
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
    requestAnimationFrame(drawWaveform);
  };

  useEffect(() => {
    drawWaveform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current]);

  const loadAudioSamples = async () => {
    const buffers: AudioBuffer[] = [];
    for (const url of audioSamples) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );
      buffers.push(audioBuffer);
    }
    setAudioBuffers(buffers);
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

  const handleCellClick = (cellID: string) => {
    r.mutate.setCellEnabled({
      id: cellID,
      enabled: !(cellID in enabledCells),
    });
  };

  const sources = useRef<Record<string, SourceNode>>({});

  useEffect(() => {
    if (!audioBuffers.length) {
      return;
    }

    const nextStartTime = calculateNextStartTime(
      audioBuffers[0].duration,
      audioContextRef.current
    );

    // loop through each row
    // if there is an add, add it and set to play at same time, and set any deletes to stop at that time too
    // else if there is a delete just stop it

    for (let y = 0; y < gridSize; y++) {
      const adds: string[] = [];
      const dels: string[] = [];
      for (let x = 0; x < gridSize; x++) {
        const id = coordsToID(x, y);
        const source = sources.current[id];
        const active = source && source.state <= SourceState.Playing;
        const added = id in enabledCells && !active;
        const deleted = active && !(id in enabledCells);
        if (added) {
          adds.push(id);
        }
        if (deleted) {
          dels.push(id);
        }
      }
      if (adds.length > 0) {
        for (const id of adds) {
          const source = new SourceNode(
            audioContextRef.current,
            audioBuffers[parseInt(id) % audioBuffers.length]
          );
          source.loop = true;
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          source.addEventListener("started", onSourceNodeChange);
          source.addEventListener("stopped", onSourceNodeChange);
          source.start(nextStartTime);
          sources.current[id] = source;
        }
        for (const id of dels) {
          const node = sources.current[id];
          node.stop(nextStartTime);
        }
      } else {
        for (const id of dels) {
          const source = sources.current[id];
          source.stop();
        }
      }
      if (adds.length > 0 || dels.length > 0) {
        onSourceNodeChange();
      }
    }
  }, [audioBuffers, enabledCells, sources]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="waveform"
        width="444"
        height="100"
      ></canvas>
      <div className="grid">
        {new Array(numCells).fill(null).map((_, i) => {
          const id = indexToID(i);
          const source = sources.current[id];
          const active = source && source.state <= SourceState.Stopping;
          const queued = source && source.state === SourceState.Queued;
          return (
            <div
              key={id}
              className={classnames("cell", id, {
                active,
                queued,
              })}
              onMouseDown={() => handleCellClick(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Grid;
