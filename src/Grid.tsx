import React, { useState, useEffect, useRef } from 'react';
import './Grid.css';

const gridSize = 8;
const fundamentalFrequency = 80; // starting frequency (in Hz)
const baseTempo = 120; // base tempo in BPM

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

  // Compressor
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-50, audioContext.currentTime); // Set threshold to -50 dB
  compressor.knee.setValueAtTime(40, audioContext.currentTime);   // A smoother knee will reduce the harshness of the compression
  compressor.ratio.setValueAtTime(12, audioContext.currentTime);  // Compression ratio
  compressor.attack.setValueAtTime(0, audioContext.currentTime);  // Fastest attack
  compressor.release.setValueAtTime(0.25, audioContext.currentTime); // Quarter of a second release

  // Play a tone
  const playTone = (frequency: number) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';  // or 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    
    // Lowpass filter
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, audioContext.currentTime);  // Adjust as per your preference

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

    // Cleanup on component unmount
    return () => {
      activeCells.forEach(cell => {
        stopTone(cell);
        clearInterval(intervals.get(cell)!);
      });
    };
  }, []); 

  const toggleCellState = (index: number) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const frequency = fundamentalFrequency * (row + 1);
    const columnTempo = baseTempo * (1 + col * 0.5);

    if (activeCells.has(index)) {
      activeCells.delete(index);
      stopTone(index);
      clearInterval(intervals.get(index)!);
      intervals.delete(index);
      oscillators.delete(index);
    } else {
      const { oscillator, gainNode } = playTone(frequency);
      oscillators.set(index, { oscillator, gainNode });
      activeCells.add(index);
      
      const playRepeatedTone = () => {
        stopTone(index);
        const { oscillator, gainNode } = playTone(frequency);
        oscillators.set(index, { oscillator, gainNode });
      };

      const intervalID = setInterval(playRepeatedTone, (60 / columnTempo) * 1000);
      intervals.set(index, intervalID);
    }

    setActiveCells(new Set([...activeCells]));
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
