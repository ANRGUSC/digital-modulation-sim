/**
 * Modulation Waveforms Visualization Component
 *
 * Shows the actual RF (passband) waveforms for each symbol in the constellation,
 * plus frequency domain representation.
 *
 * Educational Value:
 * ==================
 * This component bridges the gap between:
 * - Abstract I/Q constellation points
 * - Actual transmitted RF signals
 *
 * Key concepts illustrated:
 *
 * 1. Passband Signal:
 *    s(t) = I·cos(2πfc·t) - Q·sin(2πfc·t)
 *
 *    This can be rewritten as:
 *    s(t) = A·cos(2πfc·t + φ)
 *
 *    where A = √(I² + Q²) and φ = atan2(Q, I)
 *
 * 2. PSK (Phase Shift Keying):
 *    - All symbols have same amplitude (A = 1)
 *    - Different phases encode different bit patterns
 *    - Waveforms look like shifted sinusoids
 *
 * 3. QAM (Quadrature Amplitude Modulation):
 *    - Symbols have different amplitudes AND phases
 *    - More complex waveforms
 *    - Higher spectral efficiency but more susceptible to noise
 *
 * 4. Frequency Domain:
 *    - Shows bandwidth occupied by the signal
 *    - Pulse shaping affects spectral shape
 *    - Rectangular pulses → sinc spectrum (infinite bandwidth)
 *    - Raised cosine → controlled bandwidth
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import type { ModulationScheme } from '../types';
import { generateConstellation } from '../utils/modulation';
import { complexMagnitude, complexPhase } from '../utils/math';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface ModulationWaveformsProps {
  /** Current modulation scheme */
  scheme: ModulationScheme;
  /** Canvas width */
  width?: number;
  /** Canvas height for time domain plot */
  timeHeight?: number;
  /** Canvas height for frequency domain plot */
  freqHeight?: number;
  /** Carrier frequency in cycles per symbol (for visualization) */
  carrierCycles?: number;
  /** Whether to apply raised cosine pulse shaping */
  useRaisedCosine?: boolean;
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
  waveform: getCSSVar('--color-i-channel'),
  envelope: getCSSVar('--color-q-channel'),
  spectrum: getCSSVar('--color-spectrum'),
  text: getCSSVar('--text-muted'),
  symbolBoundary: getCSSVar('--color-grid'),
  phaseColors: [
    getCSSVar('--color-phase-1'),
    getCSSVar('--color-phase-2'),
    getCSSVar('--color-phase-3'),
    getCSSVar('--color-phase-4'),
    getCSSVar('--color-phase-5'),
    getCSSVar('--color-phase-6'),
    getCSSVar('--color-phase-7'),
    getCSSVar('--color-phase-8'),
  ],
});

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ModulationWaveforms Component
 *
 * Renders static illustrations of:
 * 1. Time-domain passband waveforms for each symbol
 * 2. Frequency-domain spectrum
 */
export const ModulationWaveforms: React.FC<ModulationWaveformsProps> = ({
  scheme,
  width = 800,
  timeHeight = 200,
  freqHeight = 150,
  carrierCycles = 4,
  useRaisedCosine: initialUseRaisedCosine = false,
}) => {
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeScrollRef = useRef<HTMLDivElement>(null);
  const [useRaisedCosine, setUseRaisedCosine] = useState(initialUseRaisedCosine);

  // Theme state - track changes to trigger canvas redraw
  const [theme, setTheme] = useState(() => {
    const doc = document.documentElement;
    return `${doc.getAttribute('data-theme') || 'dark'}|${doc.getAttribute('data-palette') || 'default'}`;
  });

  // Listen for theme changes
  useEffect(() => {
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

  // Maximum symbols to show at once (for readable display)
  const maxVisibleSymbols = 16;

  /**
   * Generate constellation for current scheme
   */
  const constellation = useMemo(() => generateConstellation(scheme), [scheme]);

  /**
   * Draw time-domain waveforms
   * For large constellations (>16 symbols), use a wider canvas with scrolling
   */
  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme-aware colors
    const COLORS = getColors();

    const numSymbols = constellation.length;

    // Calculate canvas width - expand if more symbols than can fit comfortably
    const minSymbolWidth = 50; // Minimum width per symbol for readability
    const standardWidth = width;
    const neededWidth = numSymbols * minSymbolWidth + 70; // margin for labels
    const canvasWidth = Math.max(standardWidth, neededWidth);

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = timeHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${timeHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvasWidth, timeHeight);

    // Layout
    const margin = { top: 35, right: 20, bottom: 30, left: 50 };
    const plotWidth = canvasWidth - margin.left - margin.right;
    const plotHeight = timeHeight - margin.top - margin.bottom;

    const symbolWidth = plotWidth / numSymbols;
    const samplesPerSymbol = 100;

    // Draw title
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('PASSBAND WAVEFORMS: s(t) = I*cos(2*pi*fc*t) - Q*sin(2*pi*fc*t)', margin.left, 15);

    // Draw subtitle
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Each symbol shown for one symbol period (${carrierCycles} carrier cycles)`, margin.left, 28);

    // Find max amplitude for scaling
    const maxAmplitude = Math.max(...constellation.map(p => complexMagnitude(p)));

    // Draw grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;

    // Horizontal grid at y = 0
    const y0 = margin.top + plotHeight / 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, y0);
    ctx.lineTo(canvasWidth - margin.right, y0);
    ctx.stroke();

    // Draw each symbol's waveform
    constellation.forEach((point, symbolIdx) => {
      const amplitude = complexMagnitude(point);
      const phase = complexPhase(point);
      const startX = margin.left + symbolIdx * symbolWidth;

      // Symbol boundary
      ctx.strokeStyle = COLORS.symbolBoundary;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, margin.top);
      ctx.lineTo(startX, margin.top + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw the waveform
      const colorIdx = symbolIdx % COLORS.phaseColors.length;
      ctx.strokeStyle = COLORS.phaseColors[colorIdx];
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i <= samplesPerSymbol; i++) {
        const t = i / samplesPerSymbol; // 0 to 1 within symbol
        const x = startX + t * symbolWidth;

        // Carrier phase: 2π × carrierCycles × t
        const carrierPhase = 2 * Math.PI * carrierCycles * t;

        // Passband signal: A·cos(ωt + φ)
        // With pulse shaping
        let pulseShape = 1;
        if (useRaisedCosine) {
          // Raised cosine window for smoother transitions
          pulseShape = 0.5 * (1 - Math.cos(2 * Math.PI * t));
        }

        const signal = amplitude * pulseShape * Math.cos(carrierPhase + phase);

        // Scale to plot
        const y = y0 - (signal / maxAmplitude) * (plotHeight / 2 - 10);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw bit label below
      ctx.fillStyle = COLORS.phaseColors[colorIdx];
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(point.bits, startX + symbolWidth / 2, margin.top + plotHeight + 15);

      // Draw amplitude/phase info
      ctx.fillStyle = '#64748b';
      ctx.font = '8px system-ui';
      const phaseDegs = (phase * 180 / Math.PI).toFixed(0);
      ctx.fillText(`${phaseDegs} deg`, startX + symbolWidth / 2, margin.top + plotHeight + 25);
    });

    // Draw final boundary
    ctx.strokeStyle = COLORS.symbolBoundary;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvasWidth - margin.right, margin.top);
    ctx.lineTo(canvasWidth - margin.right, margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Y-axis label
    ctx.save();
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px system-ui';
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Amplitude', 0, 0);
    ctx.restore();

    // Y-axis ticks
    ctx.fillStyle = COLORS.text;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('+1', margin.left - 5, margin.top + 10);
    ctx.fillText('0', margin.left - 5, y0 + 3);
    ctx.fillText('-1', margin.left - 5, margin.top + plotHeight - 5);

  }, [constellation, width, timeHeight, carrierCycles, useRaisedCosine, theme]);

  /**
   * Draw frequency domain (magnitude spectrum)
   *
   * Key insight: The bandwidth is determined by the symbol rate (1/T),
   * NOT the carrier frequency. For a rectangular pulse:
   * - Main lobe width = 2/T (from -1/T to +1/T around carrier)
   * - First nulls at ±1/T from carrier
   *
   * For raised cosine with roll-off α:
   * - Bandwidth = (1+α)/T
   */
  useEffect(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme-aware colors
    const COLORS = getColors();

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = freqHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${freqHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, freqHeight);

    // Layout
    const margin = { top: 30, right: 20, bottom: 35, left: 50 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = freqHeight - margin.top - margin.bottom;

    // Draw title
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('FREQUENCY SPECTRUM (Magnitude)', margin.left, 15);

    // Frequency range: show +/- (fc + 3/T) where we set fc = 4/T for this visualization
    // This makes bandwidth clearly visible relative to carrier
    const fcNorm = 4;  // Carrier at 4/T (4 symbol rates)
    const freqMin = -fcNorm - 3;  // Show from -(fc + 3/T)
    const freqMax = fcNorm + 3;   // Show to (fc + 3/T)
    const numPoints = 500;

    const toCanvasX = (f: number) => margin.left + ((f - freqMin) / (freqMax - freqMin)) * plotWidth;
    const toCanvasY = (mag: number) => margin.top + plotHeight - mag * plotHeight;

    // Draw grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;

    // Vertical grid lines at symbol rate intervals
    for (let f = Math.ceil(freqMin); f <= Math.floor(freqMax); f += 1) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(f), margin.top);
      ctx.lineTo(toCanvasX(f), margin.top + plotHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let m = 0; m <= 1; m += 0.25) {
      ctx.beginPath();
      ctx.moveTo(margin.left, toCanvasY(m));
      ctx.lineTo(width - margin.right, toCanvasY(m));
      ctx.stroke();
    }

    // Draw spectrum
    // Baseband spectrum is sinc(f·T) = sinc(f) when f is in units of 1/T
    // Passband spectrum is baseband shifted to +/- fc
    ctx.strokeStyle = COLORS.spectrum;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const alpha = 0.5; // Roll-off factor for raised cosine

    for (let i = 0; i <= numPoints; i++) {
      const f = freqMin + (i / numPoints) * (freqMax - freqMin);
      const x = toCanvasX(f);

      // Frequency offset from carrier (in units of 1/T)
      const fPos = f - fcNorm;  // Offset from +fc
      const fNeg = f + fcNorm;  // Offset from -fc

      let magnitude = 0;

      if (useRaisedCosine) {
        // Raised cosine spectrum with bandwidth (1+α)/T
        magnitude += raisedCosineSpectrum(fPos, alpha);
        magnitude += raisedCosineSpectrum(fNeg, alpha);
      } else {
        // Sinc spectrum (rectangular pulse): sinc(f·T) where f is offset from carrier
        // Main lobe from -1/T to +1/T, nulls at ±n/T
        magnitude += Math.abs(sincSpectrum(fPos));
        magnitude += Math.abs(sincSpectrum(fNeg));
      }

      // Normalize (both lobes contribute)
      magnitude = Math.min(magnitude, 1);

      const y = toCanvasY(magnitude);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Mark carrier frequencies
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // +fc
    ctx.beginPath();
    ctx.moveTo(toCanvasX(fcNorm), margin.top);
    ctx.lineTo(toCanvasX(fcNorm), margin.top + plotHeight);
    ctx.stroke();

    // -fc
    ctx.beginPath();
    ctx.moveTo(toCanvasX(-fcNorm), margin.top);
    ctx.lineTo(toCanvasX(-fcNorm), margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels for carriers
    ctx.fillStyle = '#f43f5e';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('+fc', toCanvasX(fcNorm), margin.top - 5);
    ctx.fillText('-fc', toCanvasX(-fcNorm), margin.top - 5);

    // Mark bandwidth boundaries for raised cosine
    if (useRaisedCosine) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      const bwHalf = (1 + alpha) / 2; // Half bandwidth in units of 1/T

      // Positive carrier bandwidth markers
      ctx.beginPath();
      ctx.moveTo(toCanvasX(fcNorm - bwHalf), margin.top);
      ctx.lineTo(toCanvasX(fcNorm - bwHalf), margin.top + plotHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toCanvasX(fcNorm + bwHalf), margin.top);
      ctx.lineTo(toCanvasX(fcNorm + bwHalf), margin.top + plotHeight);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // X-axis label
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (in units of 1/T, symbol rate)', width / 2, freqHeight - 5);

    // X-axis ticks - show key frequencies
    ctx.font = '9px system-ui';
    const tickValues = [-fcNorm, -fcNorm/2, 0, fcNorm/2, fcNorm];
    tickValues.forEach(f => {
      let label = '';
      if (f === 0) label = '0';
      else if (f === fcNorm) label = 'fc';
      else if (f === -fcNorm) label = '-fc';
      else if (f === fcNorm/2) label = 'fc/2';
      else if (f === -fcNorm/2) label = '-fc/2';
      ctx.fillText(label, toCanvasX(f), margin.top + plotHeight + 12);
    });

    // Y-axis label
    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('|S(f)|', 0, 0);
    ctx.restore();

    // Y-axis tick labels
    ctx.fillStyle = COLORS.text;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('1.0', margin.left - 5, margin.top + 4);
    ctx.fillText('0.5', margin.left - 5, margin.top + plotHeight / 2 + 3);
    ctx.fillText('0', margin.left - 5, margin.top + plotHeight + 3);

    // Bandwidth annotation
    const bw = useRaisedCosine ? `(1+alpha)/T = ${(1 + alpha).toFixed(1)}/T` : '2/T (main lobe)';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`Bandwidth: ${bw}`, width - margin.right, 15);

  }, [width, freqHeight, useRaisedCosine, theme]);

  return (
    <div
      className="rounded-lg p-4 border space-y-4 transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-border)'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            MODULATION WAVEFORM REFERENCE
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {scheme}: {constellation.length} symbols showing phase/amplitude encoding
          </div>
        </div>

        {/* Pulse shaping toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pulse Shaping:</span>
          <button
            onClick={() => setUseRaisedCosine(false)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              !useRaisedCosine
                ? 'bg-cyan-600 text-white'
                : 'hover:opacity-80'
            }`}
            style={useRaisedCosine ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
          >
            Rectangular
          </button>
          <button
            onClick={() => setUseRaisedCosine(true)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              useRaisedCosine
                ? 'bg-cyan-600 text-white'
                : 'hover:opacity-80'
            }`}
            style={!useRaisedCosine ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' } : {}}
          >
            Raised Cosine
          </button>
        </div>
      </div>

      {/* Time domain waveforms - scrollable for large constellations */}
      <div
        ref={timeScrollRef}
        className="rounded-lg overflow-x-auto"
        style={{ background: 'var(--canvas-bg)', maxWidth: '100%' }}
      >
        <canvas
          ref={timeCanvasRef}
          className="rounded-lg"
          style={{ background: 'var(--canvas-bg)', minWidth: width }}
        />
      </div>
      {constellation.length > maxVisibleSymbols && (
        <div className="text-xs text-center -mt-2" style={{ color: 'var(--text-muted)' }}>
          Scroll horizontally to see all {constellation.length} symbols
        </div>
      )}

      {/* Frequency domain */}
      <canvas
        ref={freqCanvasRef}
        className="rounded-lg w-full"
        style={{ background: 'var(--canvas-bg)' }}
      />

      {/* Educational notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Time Domain:</strong>
          {' '}Each symbol is shown as s(t) = A*cos(2*pi*fc*t + phi) where A is the
          amplitude and phi is the phase from the constellation point.
          {scheme.includes('PSK') && ' For PSK, all symbols have equal amplitude but different phases.'}
          {scheme.includes('QAM') && ' For QAM, symbols vary in both amplitude and phase.'}
        </div>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Frequency Domain:</strong>
          {' '}The spectrum shows energy centered at +/-fc (carrier frequency).
          {' '}Rectangular pulses have infinite bandwidth (sinc spectrum).
          {' '}Raised cosine shaping concentrates energy, reducing interference.
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sinc function for spectrum calculation
 * sinc(x) = sin(πx) / (πx)
 */
function sincSpectrum(f: number): number {
  if (Math.abs(f) < 0.001) return 1;
  const pif = Math.PI * f;
  return Math.sin(pif) / pif;
}

/**
 * Raised cosine spectrum (frequency domain)
 * Provides controlled bandwidth with roll-off factor α
 */
function raisedCosineSpectrum(f: number, alpha: number): number {
  const absF = Math.abs(f);

  // Bandwidth parameters
  const f1 = (1 - alpha) / 2;
  const f2 = (1 + alpha) / 2;

  if (absF <= f1) {
    return 1;
  } else if (absF <= f2) {
    // Raised cosine rolloff region
    return 0.5 * (1 + Math.cos(Math.PI * (absF - f1) / alpha));
  } else {
    return 0;
  }
}

export default ModulationWaveforms;
