import React, { useState, useEffect, useRef } from 'react';
import './Grid.css';
import { Reflect } from "@rocicorp/reflect/client";
import { mutators } from "../reflect/mutators.ts";
 
const r = new Reflect({
  userID: "someUser",
  roomID: "myRoom",
  socketOrigin: "ws://localhost:8080",
  mutators,
});

const gridSize = 8;
const fundamentalFrequency = 80; // starting frequency (in Hz)
const baseTempo = 40; // base tempo in BPM

const Grid: React.FC = () => {
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());
  const oscillators = useRef<Map<number, { oscillator: OscillatorNode, gainNode: GainNode }>>(new Map());
  const intervals = useRef<Map<number, number>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());
  const analyserRef = useRef<AnalyserNode>(audioContext.createAnalyser());
  analyserRef.current.fftSize = 2048;
  const bufferLength = analyserRef.current.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Compressor
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-40, audioContext.currentTime);
  compressor.knee.setValueAtTime(5, audioContext.currentTime);
  compressor.ratio.setValueAtTime(20, audioContext.currentTime);
  compressor.attack.setValueAtTime(0, audioContext.currentTime);
  compressor.release.setValueAtTime(0.25, audioContext.currentTime);

  useEffect(() => {
    activeCells.forEach(cell => {
      if (!oscillators.current.has(cell)) {
        // Start playing tone
        const row = Math.floor(cell / gridSize);
        const col = cell % gridSize;
        const frequency = fundamentalFrequency * (row + 1);
        const columnTempo = baseTempo * (1 + col * 0.5);
        const { oscillator, gainNode } = playTone(frequency);

        oscillators.current.set(cell, { oscillator, gainNode });

        const noteLength = 0.24;
        const totalDuration = (60 / columnTempo);
        const playRepeatedTone = () => {
          gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength);
          oscillator.stop(audioContext.currentTime + noteLength);
        };
        playRepeatedTone();
        const intervalID = window.setInterval(playRepeatedTone, totalDuration * 1000) as unknown as number;
        intervals.current.set(cell, intervalID);
      }
    });

    // Cells that were playing but aren't active anymore should stop
    oscillators.current.forEach((_, cell) => {
      if (!activeCells.has(cell)) {
        stopTone(cell);
        clearInterval(intervals.current.get(cell)!);
        intervals.current.delete(cell);
        oscillators.current.delete(cell);
      }
    });
  }, [activeCells]);


  // Play a tone
  const playTone = (frequency: number) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';  // or 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    
    // Lowpass filter
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, audioContext.currentTime);  // Lowpass filter setting

    gainNode.connect(compressor);
    compressor.connect(audioContext.destination);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(analyserRef.current);
    gainNode.connect(audioContext.destination);

    // More gradual fade-in/fade-out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 0.2);  // 200ms attack
    oscillator.start();

    return { oscillator, gainNode };
  };

  // Stop the tone
  const stopTone = (index: number) => {
    const { oscillator, gainNode } = oscillators.get(index) || {};

    if (gainNode && oscillator) {
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3); // 300ms release
      oscillator.stop(audioContext.currentTime + 0.31); // Stop oscillator shortly after release
    }
  }

  // Waveform visualizer
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    const width = canvas.width;
    const height = canvas.height;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "red");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "green");

    analyserRef.current.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, width, height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = gradient;
    canvasCtx.beginPath();

    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2;

        if(i === 0) {
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
    return () => {
      activeCells.forEach(cell => {
        stopTone(cell);
        clearInterval(intervals.current.get(cell)!);
      });
    };
  }, []);

  useEffect(() => {
    const unsubscribes = Array.from({ length: gridSize * gridSize }).map((_, index) => {
      return r.subscribe(
        (tx) => tx.get(`cell-${index}`),
        (value) => {
          if (typeof value === "boolean") {
            const updatedCells = new Set([...activeCells]);
            if (value) {
              updatedCells.add(index);
              setActiveCells(updatedCells);
              startTone(index); // Start the tone when the cell becomes active
            } else {
              updatedCells.delete(index);
              setActiveCells(updatedCells);
              stopTone(index); // Stop the tone when the cell is deactivated
            }
          }
        }
      );
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [r]);

  // New helper function to start the tone based on index
  const startTone = (index: number) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const frequency = fundamentalFrequency * (row + 1);
    const columnTempo = baseTempo * (1 + col * 0.5);
    const { oscillator, gainNode } = playTone(frequency);
    oscillators.current.set(index, { oscillator, gainNode });
    
    const noteLength = 0.24;
    const totalDuration = (60 / columnTempo);
    const playRepeatedTone = () => {
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength);
      oscillator.stop(audioContext.currentTime + noteLength);
    };
    playRepeatedTone();
    const intervalID = window.setInterval(playRepeatedTone, totalDuration * 1000) as unknown as number;
    intervals.current.set(index, intervalID);
  };

  const toggleCellState = (index: number) => {
    const key = `cell-${index}`;
    r.mutate.toggleCell({ key });
  };

  return (
    <div>
      <canvas ref={canvasRef} className="waveform" width="444" height="100"></canvas>
      <div className="grid">
        {Array.from({ length: gridSize * gridSize }).map((_, index) => (
          <div
            key={index}
            className={`cell ${activeCells.has(index) ? 'active' : ''}`}
            onClick={() => toggleCellState(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default Grid;