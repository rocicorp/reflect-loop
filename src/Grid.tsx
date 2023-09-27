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
const fundamentalFrequency = 80;
const baseTempo = 40;

const Grid: React.FC = () => {
  const [activeCells, setActiveCells] = useState<Set<number>>(new Set());
  const [oscillators] = useState<Map<number, { oscillator: OscillatorNode, gainNode: GainNode }>>(new Map());
  const [intervals] = useState<Map<number, number>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());
  const analyserRef = useRef<AnalyserNode>(audioContext.createAnalyser());
  analyserRef.current.fftSize = 2048;
  const bufferLength = analyserRef.current.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-40, audioContext.currentTime);
  compressor.knee.setValueAtTime(5, audioContext.currentTime);
  compressor.ratio.setValueAtTime(20, audioContext.currentTime);
  compressor.attack.setValueAtTime(0, audioContext.currentTime);
  compressor.release.setValueAtTime(0.25, audioContext.currentTime);

  const playTone = (frequency: number) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, audioContext.currentTime);

    gainNode.connect(compressor);
    compressor.connect(audioContext.destination);
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(analyserRef.current);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 0.2);
    oscillator.start();

    return { oscillator, gainNode };
  };

  const stopTone = (index: number) => {
    const { oscillator, gainNode } = oscillators.get(index) || {};

    if (gainNode && oscillator) {
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.31);
    }
  }

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
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const unsubscribes = Array.from({ length: gridSize * gridSize }).map((_, index) => {
      return r.subscribe(
        (tx) => tx.get(`cell-${index}`),
        {
          onData: (value: any) => {
            if (typeof value === "boolean") {
                setActiveCells(prev => {
                    const updatedSet = new Set([...prev]);
                    if (value) {
                        updatedSet.add(index);
                    } else {
                        updatedSet.delete(index);
                    }
                    return updatedSet;
                });
            }
          },
          onError: (error: any) => {
            console.error("Error with Reflect subscription:", error);
          }
        }
      );
    });

    drawWaveform();

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
      activeCells.forEach(cell => {
        stopTone(cell);
        clearInterval(intervals.get(cell)!);
      });
    };
  }, []);

  useEffect(() => {
    activeCells.forEach(index => {
      if (!oscillators.has(index)) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const frequency = fundamentalFrequency * (row + 1);
        const columnTempo = baseTempo * (1 + col * 0.5);

        const noteLength = 0.24;  
        const totalDuration = (60 / columnTempo); 

        const playRepeatedTone = () => {
          stopTone(index);
          const { oscillator, gainNode } = playTone(frequency);
          oscillators.set(index, { oscillator, gainNode });

          gainNode.gain.setValueAtTime(0.25, audioContext.currentTime); 
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + noteLength); 
          oscillator.stop(audioContext.currentTime + noteLength);  
        };
  
        playRepeatedTone();
        const intervalID = window.setInterval(playRepeatedTone, totalDuration * 1000) as unknown as number;
        intervals.set(index, intervalID);
      }
    });

    oscillators.forEach((_, index) => {
      if (!activeCells.has(index)) {
        stopTone(index);
        clearInterval(intervals.get(index)!);
        oscillators.delete(index);
      }
    });
  }, [activeCells]);

  const toggleCellState = (index: number) => {
    const key = `cell-${index}`;
    if (activeCells.has(index)) {
      r.mutate.deactivateCell({ key });
      setActiveCells(prev => {
        const updatedSet = new Set([...prev]);
        updatedSet.delete(index);
        return updatedSet;
      });
    } else {
      r.mutate.activateCell({ key });
      setActiveCells(prev => new Set([...prev, index]));
    }
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
