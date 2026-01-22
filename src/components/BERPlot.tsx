/**
 * BER (Bit Error Rate) Plot Component
 *
 * Displays the theoretical BER curve and optionally the current simulated
 * BER point for comparison.
 *
 * Educational Value:
 * ==================
 * The BER curve is the most important performance metric in digital
 * communications. This visualization helps students understand:
 *
 * 1. BER vs SNR Relationship:
 *    - BER decreases exponentially with increasing SNR
 *    - Shown on semi-log plot (linear SNR axis, log BER axis)
 *    - Waterfall shape is characteristic of digital modulation
 *
 * 2. Modulation Comparison:
 *    - Different schemes have different BER curves
 *    - BPSK/QPSK: Best performance (leftmost curve)
 *    - Higher order = curve shifts right (needs more SNR)
 *
 * 3. Simulation vs Theory:
 *    - Theoretical curve from closed-form equations
 *    - Simulated points should converge to theory
 *    - Confidence increases with more samples
 *
 * Key Observations:
 * - "Waterfall region": Where BER drops rapidly (typically 3-15 dB)
 * - "Error floor": Where BER levels off (not shown in AWGN)
 * - 3 dB rule: Doubling SNR gives ~10× improvement in BER region
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import { useMemo, useEffect, useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
} from 'recharts';
import type { ModulationScheme } from '../types';
import { MODULATION_SCHEMES } from '../types';
import { generateTheoreticalBERCurve } from '../utils/theory';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface BERPlotProps {
  /** Current modulation scheme */
  scheme: ModulationScheme;
  /** Current SNR value (for reference line) */
  currentSnrDb: number;
  /** Current simulated BER (if any) */
  simulatedBER: number | null;
  /** Number of bits simulated (for confidence display) */
  bitCount: number;
  /** Minimum SNR for plot range */
  snrMin?: number;
  /** Maximum SNR for plot range */
  snrMax?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// BER axis ticks (powers of 10)
const BER_TICKS = [1, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6];

// Fixed plot range
const PLOT_SNR_MIN = -5;
const PLOT_SNR_MAX = 20;

// Colors for each scheme (active state)
const getCSSVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#94a3b8';
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BERPlot Component
 *
 * Renders a semi-log BER vs Eb/N0 plot using Recharts.
 * Shows theoretical curve and current simulated point.
 */
export const BERPlot: React.FC<BERPlotProps> = ({
  scheme,
  currentSnrDb,
  simulatedBER,
  bitCount: _bitCount,  // Reserved for future confidence display
  snrMin: _snrMin,  // Ignored - using fixed range
  snrMax: _snrMax,  // Ignored - using fixed range
}) => {
  // Track theme/palette changes so colors update
  const [styleVersion, setStyleVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-palette') {
          setStyleVersion((v) => v + 1);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const schemeColors: Record<ModulationScheme, string> = useMemo(() => ({
    'BPSK': getCSSVar('--color-scheme-bpsk'),
    'QPSK': getCSSVar('--color-scheme-qpsk'),
    '8-PSK': getCSSVar('--color-scheme-8psk'),
    '16-QAM': getCSSVar('--color-scheme-16qam'),
    '64-QAM': getCSSVar('--color-scheme-64qam'),
  }), [styleVersion]);

  const colors = useMemo(() => ({
    theoretical: getCSSVar('--color-theoretical'),
    simulated: getCSSVar('--color-simulated'),
    currentSnr: getCSSVar('--color-current-snr'),
    grid: getCSSVar('--color-grid'),
    inactive: getCSSVar('--color-inactive-curve'),
  }), [styleVersion]);

  /**
   * Generate theoretical BER curves for ALL schemes.
   * This allows showing faint comparison curves in the background.
   */
  const allCurvesData = useMemo(() => {
    const curves: Record<ModulationScheme, Array<{ snrDb: number; ber: number }>> = {} as any;
    for (const s of MODULATION_SCHEMES) {
      curves[s] = generateTheoreticalBERCurve(s, PLOT_SNR_MIN, PLOT_SNR_MAX, 50, true);
    }
    return curves;
  }, []);

  /**
   * Create combined data for the chart with all schemes.
   */
  const chartData = useMemo(() => {
    // Use the current scheme's data as the base for SNR values
    const baseData = allCurvesData[scheme];
    return baseData.map((point, idx) => {
      const dataPoint: any = {
        snrDb: point.snrDb,
      };
      // Add BER for each scheme
      for (const s of MODULATION_SCHEMES) {
        const rawBer = allCurvesData[s][idx]?.ber ?? null;
        dataPoint[s] = rawBer !== null && rawBer >= 1e-6 ? rawBer : null;
      }
      // Add simulated point at the matching SNR
      if (Math.abs(point.snrDb - currentSnrDb) < 0.5 && simulatedBER !== null) {
        dataPoint.simulated = simulatedBER >= 1e-6 ? simulatedBER : null;
      } else {
        dataPoint.simulated = null;
      }
      return dataPoint;
    });
  }, [allCurvesData, scheme, currentSnrDb, simulatedBER]);

  /**
   * Custom Y-axis tick formatter for log scale.
   */
  const formatBERTick = (value: number): string => {
    if (value === 1) return '1';
    if (value === 0.1) return '10^-1';
    if (value === 0.01) return '10^-2';
    if (value === 0.001) return '10^-3';
    if (value === 0.0001) return '10^-4';
    if (value === 0.00001) return '10^-5';
    if (value === 0.000001) return '10^-6';
    return value.toExponential(0);
  };

  /**
   * Custom tooltip formatter.
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-slate-300 font-medium mb-2">
          Eb/N0 = {Number(label).toFixed(1)} dB
        </p>
        {payload.map((entry: any, index: number) => {
          if (entry.value === null) return null;
          return (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toExponential(2)}
            </p>
          );
        })}
      </div>
    );
  };

  // Calculate a sample BER at 10dB for verification display
  // This should visibly change when scheme changes
  const sampleBER = allCurvesData[scheme].find(p => Math.abs(p.snrDb - 10) < 0.5)?.ber;

  return (
    <div
      className="rounded-lg p-4 border transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-border)'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          BER PERFORMANCE
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="text-cyan-400 font-medium">{scheme}</span> over AWGN
          {sampleBER && (
            <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
              (BER@10dB: {sampleBER.toExponential(1)})
            </span>
          )}
        </div>
      </div>

      {/* Chart - key forces re-render when scheme changes */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={scheme}
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

            {/* X Axis - Linear SNR scale */}
            <XAxis
              dataKey="snrDb"
              type="number"
              domain={[PLOT_SNR_MIN, PLOT_SNR_MAX]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#64748b' }}
              axisLine={{ stroke: '#64748b' }}
              label={{
                value: 'Eb/N0 (dB)',
                position: 'bottom',
                offset: 0,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />

            {/* Y Axis - Logarithmic BER scale */}
            <YAxis
              scale="log"
              domain={[1e-6, 1]}
              ticks={BER_TICKS}
              tickFormatter={formatBERTick}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#64748b' }}
              axisLine={{ stroke: '#64748b' }}
              label={{
                value: 'BER',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-slate-300 text-sm">{value}</span>
              )}
            />

            {/* Vertical reference line at current SNR */}
            <ReferenceLine
              x={currentSnrDb}
              stroke={colors.currentSnr}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `${currentSnrDb.toFixed(1)} dB`,
                position: 'top',
                fill: colors.currentSnr,
                fontSize: 10,
              }}
            />

            {/* Inactive scheme curves (faint, in background) */}
            {MODULATION_SCHEMES.filter(s => s !== scheme).map(s => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                name={s}
                stroke={colors.inactive}
                strokeWidth={1}
                strokeOpacity={0.6}
                dot={false}
                activeDot={false}
                legendType="none"
              />
            ))}

            {/* Active scheme curve (bold, in foreground) */}
            <Line
              type="monotone"
              dataKey={scheme}
              name={`${scheme} (Theoretical)`}
              stroke={schemeColors[scheme]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: schemeColors[scheme] }}
            />

            {/* Simulated BER point */}
            <Scatter
              dataKey="simulated"
              name="Simulated"
              fill={colors.simulated}
              shape="circle"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Current values display */}
      <div className="flex justify-center gap-6 mt-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 rounded"
            style={{ backgroundColor: schemeColors[scheme] }}
          />
          <span style={{ color: 'var(--text-muted)' }}>{scheme} (selected)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded opacity-40" style={{ backgroundColor: colors.inactive }} />
          <span style={{ color: 'var(--text-muted)' }}>Other schemes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.simulated }} />
          <span style={{ color: 'var(--text-muted)' }}>Simulated BER</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: colors.currentSnr }} />
          <span style={{ color: 'var(--text-muted)' }}>Current SNR</span>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--bg-border)', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Note:</strong> This semi-log plot shows
        how BER decreases exponentially with SNR. The "waterfall" shape is characteristic
        of digital modulation over AWGN channels. Higher-order modulation shifts the
        curve to the right (requires more SNR for same BER).
      </div>
    </div>
  );
};

export default BERPlot;
