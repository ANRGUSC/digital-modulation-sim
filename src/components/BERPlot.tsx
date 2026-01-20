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

import { useMemo } from 'react';
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
const SCHEME_COLORS: Record<ModulationScheme, string> = {
  'BPSK': '#22c55e',    // Green
  'QPSK': '#3b82f6',    // Blue
  '8-PSK': '#a855f7',   // Purple
  '16-QAM': '#f97316',  // Orange
  '64-QAM': '#ef4444',  // Red
};

// Colors
const COLORS = {
  theoretical: '#22c55e',   // Green (for current scheme)
  simulated: '#eab308',     // Yellow/Gold
  currentSnr: '#ef4444',    // Red
  grid: '#334155',
  inactive: '#475569',      // Faint gray for inactive schemes
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
  /**
   * Generate theoretical BER curves for ALL schemes.
   * This allows showing faint comparison curves in the background.
   */
  const allCurvesData = useMemo(() => {
    const curves: Record<ModulationScheme, Array<{ snrDb: number; ber: number }>> = {} as any;
    for (const s of MODULATION_SCHEMES) {
      curves[s] = generateTheoreticalBERCurve(s, PLOT_SNR_MIN, PLOT_SNR_MAX, 50);
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
        dataPoint[s] = allCurvesData[s][idx]?.ber ?? null;
      }
      // Add simulated point at the matching SNR
      dataPoint.simulated = Math.abs(point.snrDb - currentSnrDb) < 0.5 && simulatedBER
        ? simulatedBER
        : null;
      return dataPoint;
    });
  }, [allCurvesData, scheme, currentSnrDb, simulatedBER]);

  /**
   * Custom Y-axis tick formatter for log scale.
   */
  const formatBERTick = (value: number): string => {
    if (value === 1) return '1';
    if (value === 0.1) return '10⁻¹';
    if (value === 0.01) return '10⁻²';
    if (value === 0.001) return '10⁻³';
    if (value === 0.0001) return '10⁻⁴';
    if (value === 0.00001) return '10⁻⁵';
    if (value === 0.000001) return '10⁻⁶';
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
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-slate-400 font-medium">
          BER PERFORMANCE
        </div>
        <div className="text-xs text-slate-500">
          <span className="text-cyan-400 font-medium">{scheme}</span> over AWGN
          {sampleBER && (
            <span className="ml-2 text-slate-600">
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
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />

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
              stroke={COLORS.currentSnr}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `${currentSnrDb.toFixed(1)} dB`,
                position: 'top',
                fill: COLORS.currentSnr,
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
                stroke={COLORS.inactive}
                strokeWidth={1}
                strokeOpacity={0.4}
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
              stroke={SCHEME_COLORS[scheme]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: SCHEME_COLORS[scheme] }}
            />

            {/* Simulated BER point */}
            <Scatter
              dataKey="simulated"
              name="Simulated"
              fill={COLORS.simulated}
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
            style={{ backgroundColor: SCHEME_COLORS[scheme] }}
          />
          <span className="text-slate-400">{scheme} (selected)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-slate-500 rounded opacity-40" />
          <span className="text-slate-400">Other schemes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span className="text-slate-400">Simulated BER</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
          <span className="text-slate-400">Current SNR</span>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
        <strong className="text-slate-400">Note:</strong> This semi-log plot shows
        how BER decreases exponentially with SNR. The "waterfall" shape is characteristic
        of digital modulation over AWGN channels. Higher-order modulation shifts the
        curve to the right (requires more SNR for same BER).
      </div>
    </div>
  );
};

export default BERPlot;
