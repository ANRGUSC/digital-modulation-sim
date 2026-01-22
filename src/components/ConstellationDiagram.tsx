/**
 * Constellation Diagram Component
 *
 * Visualizes the constellation diagram showing:
 * - Ideal constellation points (where transmitted symbols should be)
 * - Received symbols (scattered due to noise)
 *
 * Educational Value:
 * ==================
 * The constellation diagram is one of the most important visualizations
 * in digital communications. It shows:
 *
 * 1. Symbol Mapping: How bits map to I/Q coordinates
 * 2. Noise Effects: How AWGN causes received symbols to scatter
 * 3. Decision Regions: Implicitly shows which noisy symbols decode correctly
 * 4. SNR Impact: Higher noise = wider scatter = more decision errors
 *
 * Interpretation:
 * - Each cluster represents received symbols for one transmitted point
 * - Cluster spread is proportional to noise standard deviation
 * - Errors occur when noise pushes a symbol into the wrong decision region
 * - Tighter clusters (higher SNR) = fewer errors
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import type { ConstellationPoint, ReceivedSymbol, ModulationScheme } from '../types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface ConstellationDiagramProps {
  /** Ideal constellation points with bit labels */
  constellation: ConstellationPoint[];
  /** Recent received symbols (noisy) */
  receivedSymbols: ReceivedSymbol[];
  /** Current modulation scheme (for display) */
  scheme: ModulationScheme;
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Coordinate range (±axisRange for both I and Q) */
  axisRange?: number;
  /** Whether to show bit labels on ideal points */
  showLabels?: boolean;
  /** Whether to show the unit circle (for PSK schemes) */
  showUnitCircle?: boolean;
  /** Whether to show grid lines */
  showGrid?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Helper to get CSS variable value
const getCSSVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#1e293b';
};

// Colors for visualization (using CSS variables for theme support)
const getColors = () => ({
  background: getCSSVar('--canvas-bg'),
  grid: getCSSVar('--color-grid'),
  axis: getCSSVar('--color-axis'),
  idealPoint: getCSSVar('--color-ideal-point'),
  idealPointFill: getCSSVar('--color-ideal-point-fill'),
  receivedOK: getCSSVar('--color-received-ok'),
  receivedError: getCSSVar('--color-received-error'),
  receivedNormal: getCSSVar('--color-received-normal'),
  unitCircle: getCSSVar('--color-grid'),
  decisionBoundary: getCSSVar('--color-decision-boundary'),
  text: getCSSVar('--text-muted'),
  bitLabel: getCSSVar('--text-primary'),
});

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ConstellationDiagram Component
 *
 * Renders an interactive constellation diagram using HTML Canvas.
 * Shows ideal constellation points and received (noisy) symbols.
 */
// Zoom levels (higher = more zoomed in)
const ZOOM_LEVELS = [1, 1.5, 2, 3];

export const ConstellationDiagram: React.FC<ConstellationDiagramProps> = ({
  constellation,
  receivedSymbols,
  scheme,
  width = 400,
  height = 400,
  axisRange: baseAxisRange = 2,
  showLabels: showLabelsProp = false,
  showUnitCircle = true,
  showGrid = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zoom state - default to 1.5x for 64-QAM, 1x for others
  const [zoomIndex, setZoomIndex] = useState(() => scheme === '64-QAM' ? 1 : 0);

  // Label visibility state - local to this component, default to hidden
  const [showLabels, setShowLabels] = useState(showLabelsProp);

  // Auto-fit state for constellation view
  const [autoFit, setAutoFit] = useState(true);

  // Decision boundary visibility
  const [showDecisionBoundaries, setShowDecisionBoundaries] = useState(false);

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

  // Reset zoom when scheme changes (and set appropriate default)
  useEffect(() => {
    setZoomIndex(scheme === '64-QAM' ? 1 : 0);
  }, [scheme]);

  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  const maxConstellationAbs = useMemo(() => {
    if (constellation.length === 0) return baseAxisRange;
    return Math.max(
      ...constellation.map((p) => Math.max(Math.abs(p.I), Math.abs(p.Q)))
    );
  }, [constellation, baseAxisRange]);

  const maxReceivedAbs = useMemo(() => {
    if (receivedSymbols.length === 0) return 0;
    return Math.max(
      ...receivedSymbols.map((p) => Math.max(Math.abs(p.I), Math.abs(p.Q)))
    );
  }, [receivedSymbols]);

  const axisRange = autoFit
    ? Math.max(1, Math.max(maxConstellationAbs, maxReceivedAbs) * 1.2)
    : baseAxisRange / zoomLevel;

  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;

  const handleZoomIn = () => {
    if (canZoomIn) setZoomIndex(z => z + 1);
  };

  const handleZoomOut = () => {
    if (canZoomOut) setZoomIndex(z => z - 1);
  };

  /**
   * Determine if this is a PSK scheme (points on unit circle).
   */
  const isPSK = useMemo(() => {
    return scheme === 'BPSK' || scheme === 'QPSK' || scheme === '8-PSK';
  }, [scheme]);

  /**
   * Main drawing effect - redraws whenever props change.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    // Define coordinate transformation functions
    // Map I/Q coordinates to canvas pixels
    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    const toCanvasX = (i: number) => margin + ((i + axisRange) / (2 * axisRange)) * plotWidth;
    const toCanvasY = (q: number) => margin + ((axisRange - q) / (2 * axisRange)) * plotHeight;

    // Draw grid
    if (showGrid) {
      const tickStep = getNiceStep(axisRange);
      drawGrid(ctx, margin, width, height, axisRange, toCanvasX, toCanvasY, COLORS, tickStep);
    }

    // Draw unit circle for PSK schemes
    if (showUnitCircle && isPSK) {
      drawUnitCircle(ctx, toCanvasX, toCanvasY, COLORS);
    }

    // Draw axes
    drawAxes(ctx, margin, width, height, axisRange, toCanvasX, toCanvasY, COLORS);

    // Draw decision boundaries
    if (showDecisionBoundaries) {
      drawDecisionBoundaries(ctx, scheme, constellation, axisRange, toCanvasX, toCanvasY, COLORS);
    }

    // Draw received symbols first (so ideal points overlay them)
    drawReceivedSymbols(ctx, receivedSymbols, toCanvasX, toCanvasY, COLORS);

    // Draw ideal constellation points
    drawIdealPoints(ctx, constellation, toCanvasX, toCanvasY, showLabels, COLORS);

    // Draw axis labels
    drawAxisLabels(ctx, margin, width, height, COLORS);

  }, [constellation, receivedSymbols, width, height, axisRange, showLabels, showUnitCircle, showGrid, isPSK, theme, showDecisionBoundaries]);

  return (
    <div
      className="rounded-lg p-4 border transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-border)'
      }}
      role="region"
      aria-labelledby="constellation-heading"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }} id="constellation-heading">
          CONSTELLATION DIAGRAM
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-fit toggle */}
          <button
            onClick={() => setAutoFit(!autoFit)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              autoFit
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            title="Auto-fit the axis range to the visible constellation and received points"
            aria-label={autoFit ? 'Disable auto-fit axis range' : 'Enable auto-fit axis range'}
            aria-pressed={autoFit}
          >
            {autoFit ? 'Auto-Fit On' : 'Auto-Fit Off'}
          </button>

          {/* Decision boundaries toggle */}
          <button
            onClick={() => setShowDecisionBoundaries(!showDecisionBoundaries)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showDecisionBoundaries
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            title="Show decision boundaries for the current modulation scheme"
            aria-label={showDecisionBoundaries ? 'Hide decision boundaries' : 'Show decision boundaries'}
            aria-pressed={showDecisionBoundaries}
          >
            {showDecisionBoundaries ? 'Boundaries On' : 'Boundaries Off'}
          </button>

          {/* Bit labels toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showLabels
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
            title="Toggle Gray-coded bit labels on constellation points. Shows how bits map to I/Q coordinates."
            aria-label={`${showLabels ? 'Hide' : 'Show'} bit labels on constellation points`}
            aria-pressed={showLabels}
          >
            {showLabels ? 'Labels On' : 'Labels Off'}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              disabled={!canZoomOut || autoFit}
              className={`w-6 h-6 rounded text-sm font-bold transition-colors ${
                canZoomOut && !autoFit
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="Zoom out the constellation diagram to see a wider I/Q range"
              aria-label="Zoom out constellation diagram"
            >
              -
            </button>
            <span className="text-xs w-10 text-center" style={{ color: 'var(--text-muted)' }} aria-live="polite" aria-atomic="true">
              {autoFit ? 'Auto' : `${zoomLevel}x`}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={!canZoomIn || autoFit}
              className={`w-6 h-6 rounded text-sm font-bold transition-colors ${
                canZoomIn && !autoFit
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="Zoom in the constellation diagram to see constellation points and noise scatter in more detail"
              aria-label="Zoom in constellation diagram"
            >
              +
            </button>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }} aria-live="polite">
            {receivedSymbols.length} symbols
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-lg"
          style={{ background: 'var(--canvas-bg)' }}
          role="img"
          aria-label={`Constellation diagram for ${scheme} showing ${constellation.length} ideal points and ${receivedSymbols.length} received symbols`}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3 text-xs" role="list" aria-label="Constellation diagram legend">
        <div className="flex items-center gap-2" role="listitem">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-ideal-point)' }} aria-hidden="true" />
          <span style={{ color: 'var(--text-muted)' }}>Ideal points</span>
        </div>
        <div className="flex items-center gap-2" role="listitem">
          <span className="font-bold" style={{ color: 'var(--color-received-normal)' }} aria-hidden="true">x</span>
          <span style={{ color: 'var(--text-muted)' }}>Received</span>
        </div>
        <div className="flex items-center gap-2" role="listitem">
          <span className="font-bold" style={{ color: 'var(--color-received-error)' }} aria-hidden="true">x</span>
          <span style={{ color: 'var(--text-muted)' }}>Error</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// DRAWING HELPER FUNCTIONS
// =============================================================================

/**
 * Draw the background grid.
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  margin: number,
  width: number,
  height: number,
  axisRange: number,
  toCanvasX: (i: number) => number,
  toCanvasY: (q: number) => number,
  COLORS: ReturnType<typeof getColors>,
  tickStep: number
) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;

  // Vertical grid lines
  for (let i = -axisRange; i <= axisRange + 1e-6; i += tickStep) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(i), margin);
    ctx.lineTo(toCanvasX(i), height - margin);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let q = -axisRange; q <= axisRange + 1e-6; q += tickStep) {
    ctx.beginPath();
    ctx.moveTo(margin, toCanvasY(q));
    ctx.lineTo(width - margin, toCanvasY(q));
    ctx.stroke();
  }
}

/**
 * Draw the unit circle (for PSK schemes).
 */
function drawUnitCircle(
  ctx: CanvasRenderingContext2D,
  toCanvasX: (i: number) => number,
  toCanvasY: (q: number) => number,
  COLORS: ReturnType<typeof getColors>
) {
  ctx.strokeStyle = COLORS.unitCircle;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  const centerX = toCanvasX(0);
  const centerY = toCanvasY(0);
  const radius = toCanvasX(1) - toCanvasX(0);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.setLineDash([]);
}

/**
 * Draw the I and Q axes.
 */
function drawAxes(
  ctx: CanvasRenderingContext2D,
  margin: number,
  width: number,
  height: number,
  axisRange: number,
  toCanvasX: (i: number) => number,
  toCanvasY: (q: number) => number,
  COLORS: ReturnType<typeof getColors>
) {
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1;

  // I axis (horizontal through Q=0)
  ctx.beginPath();
  ctx.moveTo(margin, toCanvasY(0));
  ctx.lineTo(width - margin, toCanvasY(0));
  ctx.stroke();

  // Q axis (vertical through I=0)
  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), margin);
  ctx.lineTo(toCanvasX(0), height - margin);
  ctx.stroke();

  // Axis tick marks and labels
  ctx.fillStyle = COLORS.text;
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';

  // I axis ticks
  const tickStep = getNiceStep(axisRange);
  for (let i = -axisRange; i <= axisRange + 1e-6; i += tickStep) {
    if (Math.abs(i) < 1e-10) continue;
    const x = toCanvasX(i);
    const y = toCanvasY(0);
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.stroke();
    ctx.fillText(formatAxisTick(i), x, y + 15);
  }

  // Q axis ticks
  ctx.textAlign = 'right';
  for (let q = -axisRange; q <= axisRange + 1e-6; q += tickStep) {
    if (Math.abs(q) < 1e-10) continue;
    const x = toCanvasX(0);
    const y = toCanvasY(q);
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.stroke();
    ctx.fillText(formatAxisTick(q), x - 8, y + 3);
  }
}

/**
 * Draw decision boundaries for PSK and square QAM schemes.
 */
function drawDecisionBoundaries(
  ctx: CanvasRenderingContext2D,
  scheme: ModulationScheme,
  constellation: ConstellationPoint[],
  axisRange: number,
  toCanvasX: (i: number) => number,
  toCanvasY: (q: number) => number,
  COLORS: ReturnType<typeof getColors>
) {
  ctx.strokeStyle = COLORS.decisionBoundary;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);

  if (scheme.includes('PSK')) {
    const angles = constellation.map((p) => Math.atan2(p.Q, p.I)).sort((a, b) => a - b);
    if (angles.length > 1) {
      const boundaries: number[] = [];
      for (let i = 0; i < angles.length; i++) {
        const a1 = angles[i];
        const a2 = i === angles.length - 1 ? angles[0] + 2 * Math.PI : angles[i + 1];
        boundaries.push((a1 + a2) / 2);
      }

      boundaries.forEach((theta) => {
        const x1 = axisRange * Math.cos(theta);
        const y1 = axisRange * Math.sin(theta);
        ctx.beginPath();
        ctx.moveTo(toCanvasX(-x1), toCanvasY(-y1));
        ctx.lineTo(toCanvasX(x1), toCanvasY(y1));
        ctx.stroke();
      });
    }
  } else if (scheme.includes('QAM')) {
    const uniqueI = Array.from(new Set(constellation.map((p) => p.I))).sort((a, b) => a - b);
    const uniqueQ = Array.from(new Set(constellation.map((p) => p.Q))).sort((a, b) => a - b);

    for (let i = 0; i < uniqueI.length - 1; i++) {
      const mid = (uniqueI[i] + uniqueI[i + 1]) / 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(mid), toCanvasY(-axisRange));
      ctx.lineTo(toCanvasX(mid), toCanvasY(axisRange));
      ctx.stroke();
    }

    for (let q = 0; q < uniqueQ.length - 1; q++) {
      const mid = (uniqueQ[q] + uniqueQ[q + 1]) / 2;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-axisRange), toCanvasY(mid));
      ctx.lineTo(toCanvasX(axisRange), toCanvasY(mid));
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
}

/**
 * Pick a nice tick step for the given axis range.
 */
function getNiceStep(axisRange: number): number {
  const targetTicks = 6;
  const rawStep = (axisRange * 2) / targetTicks;
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 4, 5, 10];
  return steps.find((step) => step >= rawStep) || 10;
}

function formatAxisTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

/**
 * Draw axis labels (I and Q).
 */
function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  _margin: number,  // Unused, kept for consistent function signature
  width: number,
  height: number,
  COLORS: ReturnType<typeof getColors>
) {
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px system-ui';

  // I axis label
  ctx.textAlign = 'center';
  ctx.fillText('In-Phase (I)', width / 2, height - 8);

  // Q axis label (rotated)
  ctx.save();
  ctx.translate(12, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Quadrature (Q)', 0, 0);
  ctx.restore();
}

/**
 * Draw received (noisy) symbols.
 */
function drawReceivedSymbols(
  ctx: CanvasRenderingContext2D,
  receivedSymbols: ReceivedSymbol[],
  toCanvasX: (i: number) => number,
  toCanvasY: (q: number) => number,
  COLORS: ReturnType<typeof getColors>
) {
  const markerSize = 4;

  receivedSymbols.forEach((symbol, index) => {
    const x = toCanvasX(symbol.I);
    const y = toCanvasY(symbol.Q);

    // Fade older symbols (newer symbols are at the end of array)
    const age = receivedSymbols.length - index;
    const alpha = Math.max(0.3, 1 - age / receivedSymbols.length);

    // Choose color based on error status
    const color = symbol.isError ? COLORS.receivedError : COLORS.receivedOK;

    // Draw × marker
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(x - markerSize, y - markerSize);
    ctx.lineTo(x + markerSize, y + markerSize);
    ctx.moveTo(x + markerSize, y - markerSize);
    ctx.lineTo(x - markerSize, y + markerSize);
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
}

/**
 * Draw ideal constellation points.
 */
function drawIdealPoints(
  ctx: CanvasRenderingContext2D,
  constellation: ConstellationPoint[],
  toCanvasX: (i: number) => number,
  toCanvasY: (q: number) => number,
  showLabels: boolean,
  COLORS: ReturnType<typeof getColors>
) {
  const pointRadius = 8;

  constellation.forEach(point => {
    const x = toCanvasX(point.I);
    const y = toCanvasY(point.Q);

    // Draw filled circle
    ctx.fillStyle = COLORS.idealPointFill;
    ctx.strokeStyle = COLORS.idealPoint;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw bit label
    if (showLabels) {
      ctx.fillStyle = COLORS.bitLabel;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Position label above or below point to avoid overlap
      const labelY = point.Q >= 0 ? y - pointRadius - 10 : y + pointRadius + 10;
      ctx.fillText(point.bits, x, labelY);
    }
  });
}

export default ConstellationDiagram;
