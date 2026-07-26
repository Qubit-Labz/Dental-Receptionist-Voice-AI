import { useEffect, useRef, useMemo } from 'react';

interface VoiceVisualizerProps {
  isRecording: boolean;
  isPlaying: boolean;
  analyserNode: AnalyserNode | null;
}

export default function VoiceVisualizer({ isRecording, isPlaying, analyserNode }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const idleBars = useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < 64; i++) {
      bars.push(Math.random() * 0.3 + 0.05);
    }
    return bars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const dataArray = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : null;

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const barCount = 64;
      const gap = 3;
      const barWidth = (w - gap * (barCount - 1)) / barCount;

      const getBarHeight = (i: number): number => {
        if (dataArray && analyserNode && (isRecording || isPlaying)) {
          analyserNode.getByteFrequencyData(dataArray);
          const step = Math.floor(dataArray.length / barCount);
          const value = dataArray[i * step] / 255;
          return value * 0.85 + 0.05;
        }
        // Idle animation - gentle pulse
        const t = Date.now() / 2000;
        const wave = Math.sin(t + i * 0.15) * 0.1 + 0.15;
        return idleBars[i] * 0.5 + wave;
      };

      for (let i = 0; i < barCount; i++) {
        const normalized = getBarHeight(i);
        const barH = normalized * h * 0.8;
        const x = i * (barWidth + gap);
        const y = (h - barH) / 2;

        const alpha = 0.3 + normalized * 0.7;

        // Gradient per bar
        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, `rgba(168, 85, 247, ${alpha})`);
        grad.addColorStop(0.5, `rgba(192, 132, 252, ${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(168, 85, 247, ${alpha})`);

        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 3);
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barH - radius);
        ctx.quadraticCurveTo(x + barWidth, y + barH, x + barWidth - radius, y + barH);
        ctx.lineTo(x + radius, y + barH);
        ctx.quadraticCurveTo(x, y + barH, x, y + barH - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, [isRecording, isPlaying, analyserNode, idleBars]);

  const statusText = isPlaying
    ? 'AI is speaking...'
    : isRecording
      ? 'Listening...'
      : 'Tap the microphone to speak';

  const statusColor = isPlaying
    ? 'text-purple-400'
    : isRecording
      ? 'text-red-400'
      : 'text-gray-500';

  return (
    <div className="flex flex-col items-center w-full">
      {/* Outer glow ring */}
      <div
        className={`relative w-full max-w-2xl aspect-[2.5/1] rounded-3xl overflow-hidden transition-all duration-500 ${
          isRecording
            ? 'shadow-[0_0_60px_rgba(239,68,68,0.15)] border border-red-500/20'
            : isPlaying
              ? 'shadow-[0_0_60px_rgba(168,85,247,0.15)] border border-purple-500/20'
              : 'shadow-[0_0_30px_rgba(168,85,247,0.05)] border border-gray-800'
        } bg-[#0d1117]`}
      >
        {/* Background subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] via-transparent to-purple-500/[0.02]" />

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Center pulse ring when recording */}
        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full border-2 border-red-500/30 animate-ping" />
          </div>
        )}

        {/* Center pulse ring when playing */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full border-2 border-purple-500/30 animate-ping" />
          </div>
        )}
      </div>

      <p className={`mt-6 text-sm font-medium ${statusColor} transition-colors duration-300`}>
        {statusText}
      </p>
    </div>
  );
}
