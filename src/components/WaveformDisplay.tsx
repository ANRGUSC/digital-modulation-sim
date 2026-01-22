/**
 * Waveform Display Component
 *
 * Visualizes time-domain I(t) and Q(t) waveforms for both transmitted
 * and received signals.
 *
 * Educational Value:
 * ==================
 * This component helps students understand:
 *
 * 1. Baseband Representation:
 *    - I(t): In-phase component (cosine carrier modulation)
 *    - Q(t): Quadrature component (sine carrier modulation)
 *    - Together they represent the complex envelope
 *
 * 2. Symbol Transitions:
 *    - Each symbol period shows constant I/Q values (rectangular pulse)
 *    - Transitions at symbol boundaries
 *    - Symbol values correspond to constellation points
 *
 * 3. Noise Effects:
 *    - Transmitted signal: clean, discrete levels
 *    - Received signal: corrupted by AWGN
 *    - Higher noise = more visible corruption
 *
 * 4. Pulse Shaping:
 *    - Rectangular pulses shown (simple but infinite bandwidth)
 *    - Real systems use raised cosine for bandwidth efficiency
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React, { useRef, useEffect } from 'react';
import type { WaveformData } from '../types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface WaveformDisplayProps {
  /** Transmitted waveform data */
  transmittedWaveform: WaveformData;
  /** Received (noisy) waveform data */
  receivedWaveform: WaveformData;
  /** Transmitted bits for labeling */
  bits: number[];
  /** Bits per symbol (for label grouping) */
  bitsPerSymbol: number;
  /** Canvas width */
  width?: number;
  /** Canvas height for each waveform plot */
  height?: number;
  /** Number of symbols displayed */
  numSymbols?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Helper to get CSS variable value
const getCSSVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#1e293b';
};

// Get theme-aware colors
const getColors = () => ({
  background: getCSSVar('--canvas-bg'),
  grid: getCSSVar('--color-grid'),
  axis: getCSSVar('--color-axis'),
  iChannel: getCSSVar('--color-i-channel'),
  qChannel: getCSSVar('--color-q-channel'),
  iChannelFaded: 'rgba(34, 211, 238, 0.6)',
  qChannelFaded: 'rgba(249, 115, 22, 0.6)',
  symbolBoundary: getCSSVar('--color-grid'),
  text: getCSSVar('--text-muted'),
  bitLabel: getCSSVar('--text-primary'),
});

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * WaveformDisplay Component
 *
 * Renders two stacked waveform plots:
 * 1. Transmitted signal (clean)
 * 2. Received signal (with noise)
 *
 * Each plot shows I(t) and Q(t) components in different colors.
 */
export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  transmittedWaveform,
  receivedWaveform,
  bits,
  bitsPerSymbol,
  width = 800,
  height = 150,
  numSymbols = 8,
}) => {
  const txCanvasRef = useRef<HTMLCanvasElement>(null);
  const rxCanvasRef = useRef<HTMLCanvasElement>(null);

  // Theme state - track changes to trigger canvas redraw
  const [theme, setTheme] = React.useState(() => {
    const doc = document.documentElement;
    return `${doc.getAttribute('data-theme') || 'dark'}|${doc.getAttribute('data-palette') || 'default'}`;
  });

  // Listen for theme changes
  React.useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-palette') {
          const doc = document.documentElement;
          setTheme(`${doc.getAttribute('data-theme') || 'dark'}|${doc.getAttribute('data-palette') || 'default'}`);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  /**
   * Draw a waveform on the given canvas.
   */
  const drawWaveform = (
    canvas: HTMLCanvasElement,
    waveform: WaveformData,
    title: string,
    showBitLabels: boolean
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme-aware colors
    const COLORS = getColors();

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Layout
    const margin = { top: 30, right: 20, bottom: 25, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Value range for Y axis (amplitude)
    const yMin = -1.8;
    const yMax = 1.8;

    // Coordinate transforms
    const toCanvasX = (t: number) => margin.left + (t / numSymbols) * plotWidth;
    const toCanvasY = (v: number) => margin.top + ((yMax - v) / (yMax - yMin)) * plotHeight;

    // Draw title
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(title, margin.left, 15);

    // Draw bit labels above waveform (only for transmitted)
    if (showBitLabels && bits.length > 0) {
      ctx.font = '10px monospace';
      ctx.fillStyle = COLORS.bitLabel;
      ctx.textAlign = 'center';

      for (let sym = 0; sym < numSymbols && sym * bitsPerSymbol < bits.length; sym++) {
        const bitGroup = bits.slice(sym * bitsPerSymbol, (sym + 1) * bitsPerSymbol).join('');
        const x = toCanvasX(sym + 0.5);
        ctx.fillText(bitGroup, x, margin.top - 5);
      }
    }

    // Draw grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    for (let v = -1.5; v <= 1.5; v += 0.5) {
      ctx.beginPath();
      ctx.moveTo(margin.left, toCanvasY(v));
      ctx.lineTo(width - margin.right, toCanvasY(v));
      ctx.stroke();
    }

    // Draw symbol boundaries (vertical dashed lines)
    ctx.strokeStyle = COLORS.symbolBoundary;
    ctx.setLineDash([4, 4]);
    for (let sym = 0; sym <= numSymbols; sym++) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(sym), margin.top);
      ctx.lineTo(toCanvasX(sym), height - margin.bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw zero line (thicker)
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, toCanvasY(0));
    ctx.lineTo(width - margin.right, toCanvasY(0));
    ctx.stroke();

    // Draw Y axis labels
    ctx.fillStyle = COLORS.text;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [-1, 0, 1].forEach(v => {
      ctx.fillText(v.toString(), margin.left - 5, toCanvasY(v));
    });

    // Draw waveforms if we have data
    if (waveform.t.length > 0) {
      // Draw I(t) - In-phase component
      drawSignalTrace(ctx, waveform.t, waveform.I, COLORS.iChannel, toCanvasX, toCanvasY, numSymbols);

      // Draw Q(t) - Quadrature component
      drawSignalTrace(ctx, waveform.t, waveform.Q, COLORS.qChannel, toCanvasX, toCanvasY, numSymbols);
    }

    // Draw axis labels
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Time (symbol periods)', width / 2, height - 5);

    // Draw legend
    const legendY = 15;
    const legendX = width - margin.right - 100;
    ctx.font = '10px system-ui';

    ctx.fillStyle = COLORS.iChannel;
    ctx.fillText('I(t)', legendX, legendY);

    ctx.fillStyle = COLORS.qChannel;
    ctx.fillText('Q(t)', legendX + 40, legendY);
  };

  /**
   * Draw a single signal trace.
   */
  const drawSignalTrace = (
    ctx: CanvasRenderingContext2D,
    _t: number[],  // Time array (unused, using index-based calculation)
    values: number[],
    color: string,
    toCanvasX: (t: number) => number,
    toCanvasY: (v: number) => number,
    numSymbols: number
  ) => {
    if (values.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Calculate samples per symbol from data length
    const samplesPerSymbol = Math.floor(values.length / numSymbols);

    for (let i = 0; i < values.length; i++) {
      // Calculate time from sample index
      const time = i / samplesPerSymbol;
      const x = toCanvasX(time);
      const y = toCanvasY(Math.max(-1.7, Math.min(1.7, values[i])));

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  };

  /**
   * Redraw when waveform data changes.
   */
  useEffect(() => {
    if (txCanvasRef.current) {
      drawWaveform(
        txCanvasRef.current,
        transmittedWaveform,
        'TRANSMITTED BASEBAND SIGNAL',
        true
      );
    }
  }, [transmittedWaveform, bits, bitsPerSymbol, width, height, numSymbols, theme]);

  useEffect(() => {
    if (rxCanvasRef.current) {
      drawWaveform(
        rxCanvasRef.current,
        receivedWaveform,
        'RECEIVED SIGNAL (with AWGN)',
        false
      );
    }
  }, [receivedWaveform, width, height, numSymbols, theme]);

  return (
    <div
      className="rounded-lg p-4 border space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-border)'
      }}
    >
      {/* Transmitted Waveform */}
      <div>
        <canvas
          ref={txCanvasRef}
          className="rounded-lg w-full"
          style={{ background: 'var(--canvas-bg)' }}
        />
      </div>

      {/* Received Waveform */}
      <div>
        <canvas
          ref={rxCanvasRef}
          className="rounded-lg w-full"
          style={{ background: 'var(--canvas-bg)' }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: 'var(--color-i-channel)' }} />
          <span style={{ color: 'var(--text-muted)' }}>I(t) - In-phase</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: 'var(--color-q-channel)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Q(t) - Quadrature</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: 'var(--color-grid)' }} />
          <span style={{ color: 'var(--text-muted)' }}>Symbol boundaries</span>
        </div>
      </div>
    </div>
  );
};

export default WaveformDisplay;
