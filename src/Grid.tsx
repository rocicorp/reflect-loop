import {useEffect, useRef, useState} from 'react';
import './Grid.css';
import {Reflect} from '@rocicorp/reflect/client';
import {mutators} from '../reflect/mutators';
import {useSubscribe} from 'replicache-react';
import {listCells} from './cell';
import classnames from 'classnames';

function calculateNextStartTime(
  sampleDuration: number,
  audioContext: AudioContext,
) {
  if (audioContext.currentTime === 0) {
    return audioContext.currentTime;
  }

  const nextQuantizedTime =
    Math.ceil(audioContext.currentTime / sampleDuration) * sampleDuration;
  return nextQuantizedTime;
}

const r = new Reflect({
  roomID: 'r1',
  userID: 'anon',
  mutators,
  socketOrigin: 'ws://localhost:8080',
});

function Grid() {
  const cells = useSubscribe(r, listCells, null);

  const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[]>([]);
  const [sampleSources, setSampleSources] = useState<
    Map<string, AudioBufferSourceNode>
  >(new Map());
  const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);

  /*
  //const queueTimerID = useRef<number | null>(null);
  >(Array(gridSize * gridSize).fill(null));
  */
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const audioContextRef = useRef(new window.AudioContext());
  const analyserRef = useRef<AnalyserNode>(
    audioContextRef.current.createAnalyser(),
  );
  const bufferLength = analyserRef.current.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const audioSamples = [
    '/samples/loop-01.wav',
    '/samples/loop-02.wav',
    '/samples/loop-03.wav',
    '/samples/loop-04.wav',
    '/samples/loop-05.wav',
    '/samples/loop-06.wav',
    '/samples/loop-07.wav',
    '/samples/loop-08.wav',
    '/samples/loop-09.wav',
    '/samples/loop-10.wav',
    // ... Need to add 64 total samples
  ];

  const drawWaveform = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(0.5, 'yellow');
    gradient.addColorStop(1, 'green');

    analyserRef.current.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
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
        arrayBuffer,
      );
      buffers.push(audioBuffer);
    }
    setAudioBuffers(buffers);
  };

  useEffect(() => {
    loadAudioSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  useEffect(() => {
    if (queuedCells.size === 0) {
      return;
    }
    if (queueTimerID.current !== null) {
      clearTimeout(queueTimerID.current);
      queueTimerID.current = null;
    }
    queueTimerID.current = window.setTimeout(() => {
      setQueuedCells(new Set());
    }, 100);
  });
  */

  const handleCellClick = (cellID: string) => {
    r.mutate.toggleCell(cellID);
    /*
    setQueuedCells(prev => {
      const updated = new Set(prev);
      updated.add(cellID);
      return updated;
    });
    */
  };

  useEffect(() => {
    if (audioBuffers.length === 0) {
      console.log('No audio buffers loaded.');
      return;
    }

    if (globalStartTime === null) {
      console.log('Setting global start time.');
      setGlobalStartTime(audioContextRef.current.currentTime);
    }

    if (!cells) {
      return;
    }

    for (const c of cells) {
      if (c.enabled && !sampleSources.has(c.id)) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffers[parseInt(c.id) % audioBuffers.length];
        source.loop = true;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        const nextStartTime = calculateNextStartTime(
          source.buffer.duration,
          audioContextRef.current,
        );
        source.start(nextStartTime);
        setSampleSources(prev => {
          const updated = new Map(prev);
          updated.set(c.id, source);
          return updated;
        });
      }
    }

    for (const [id, source] of sampleSources.entries()) {
      if (!cells.find(c => id == c.id)!.enabled) {
        const nextStartTime = calculateNextStartTime(
          source.buffer!.duration,
          audioContextRef.current,
        );
        source.stop(nextStartTime);
        setSampleSources(prev => {
          const updated = new Map(prev);
          updated.delete(id);
          return updated;
        });
      }
    }
  }, [cells, audioBuffers, sampleSources, globalStartTime]);

  if (!cells) {
    return null;
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="waveform"
        width="444"
        height="100"
      ></canvas>
      <div className="grid">
        {cells.map(cell => (
          <div
            key={cell.id}
            className={classnames('cell', cell.id, {
              active: cell.enabled,
              //queued: queuedCells.has(cell.id),
            })}
            onMouseDown={() => handleCellClick(cell.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default Grid;
