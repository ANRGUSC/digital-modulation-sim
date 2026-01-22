/**
 * Statistics Panel Component
 *
 * Displays real-time simulation statistics including:
 * - Symbol and bit counts
 * - Error counts
 * - Simulated vs theoretical BER
 *
 * Educational Value:
 * ==================
 * This panel helps students understand:
 * 1. BER convergence: Simulated BER approaches theoretical as sample size grows
 * 2. Statistical confidence: More samples = more reliable BER estimate
 * 3. Modulation trade-offs: Higher-order modulation = higher BER at same SNR
 *
 * BER Interpretation:
 * - BER = 10^-3 means 1 error per 1000 bits on average
 * - BER = 10^-6 means 1 error per 1,000,000 bits (typical requirement)
 * - Need ~100 errors minimum for statistically significant BER estimate
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React from 'react';
import type { ModulationScheme } from '../types';
import { BITS_PER_SYMBOL } from '../types';
import { simulateBerAtSnr } from '../utils/sweep';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

const SWEEP_BITS_PER_POINT = 20000;
const SWEEP_STEP_DB = 1;

interface StatisticsPanelProps {
  /** Current modulation scheme */
  scheme: ModulationScheme;
  /** Current Eb/N0 in dB */
  snrDb: number;
  /** Total symbols transmitted */
  symbolCount: number;
  /** Total bits transmitted */
  bitCount: number;
  /** Total bit errors detected */
  errorCount: number;
  /** Calculated simulated BER */
  simulatedBER: number;
  /** Theoretical BER for comparison */
  theoreticalBER: number;
  /** Whether simulation is currently running */
  isPlaying: boolean;
  /** Minimum SNR for sweep */
  snrMin: number;
  /** Maximum SNR for sweep */
  snrMax: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format large numbers with commas for readability.
 * e.g., 12345 → "12,345"
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * Format BER in scientific notation.
 * e.g., 0.00123 → "1.23e-3"
 * Special handling for zero and very small values.
 */
function formatBER(ber: number): string {
  if (ber === 0) {
    return '0';
  }
  if (ber < 1e-10) {
    return '< 1e-10';
  }
  // Use exponential notation
  return ber.toExponential(2);
}

/**
 * Calculate the sample size quality for BER estimation.
 * Based on rule of thumb: need ~100 errors for statistically meaningful estimate.
 *
 * Note: This measures SAMPLE SIZE, not accuracy! A large sample can still
 * give wrong results if there's a bug. Check the BER ratio for accuracy.
 */
function getSampleSizeQuality(errorCount: number, bitCount: number): {
  level: string;
  color: string;
  percentage: number;
} {
  if (bitCount === 0) {
    return { level: 'No Data', color: 'text-slate-500', percentage: 0 };
  }
  if (errorCount < 10) {
    return { level: 'Need more samples', color: 'text-red-400', percentage: 20 };
  }
  if (errorCount < 50) {
    return { level: 'Low sample size', color: 'text-orange-400', percentage: 40 };
  }
  if (errorCount < 100) {
    return { level: 'Moderate', color: 'text-yellow-400', percentage: 60 };
  }
  if (errorCount < 500) {
    return { level: 'Good sample size', color: 'text-lime-400', percentage: 80 };
  }
  return { level: 'Large sample', color: 'text-green-400', percentage: 100 };
}

/**
 * Check if the simulated BER is reasonably close to theoretical.
 * Returns accuracy assessment based on the ratio.
 *
 * Statistical expectation: With 100+ errors, the ratio should be
 * within about 0.8 to 1.2 (95% of the time).
 */
function getAccuracyAssessment(
  simulatedBER: number,
  theoreticalBER: number,
  errorCount: number
): { level: string; color: string; isGood: boolean } {
  if (errorCount < 10 || theoreticalBER === 0 || simulatedBER === 0) {
    return { level: 'Insufficient data', color: 'text-slate-500', isGood: false };
  }

  const ratio = simulatedBER / theoreticalBER;

  // Expected standard deviation of ratio ≈ 1/sqrt(errorCount)
  // With 100 errors, expect ratio within ±20% (0.8 to 1.2)
  // With 500 errors, expect ratio within ±9% (0.91 to 1.09)
  const expectedStdDev = 1 / Math.sqrt(errorCount);
  const tolerance = 2.5 * expectedStdDev; // ~99% confidence interval

  if (ratio > 1 - tolerance && ratio < 1 + tolerance) {
    return { level: 'Converging well', color: 'text-green-400', isGood: true };
  } else if (ratio > 0.7 && ratio < 1.4) {
    return { level: 'Within range', color: 'text-yellow-400', isGood: true };
  } else {
    return { level: 'Check simulation', color: 'text-red-400', isGood: false };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * StatisticsPanel Component
 *
 * Renders a comprehensive statistics display showing simulation progress
 * and BER comparison between simulated and theoretical values.
 */
export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  scheme,
  snrDb,
  symbolCount,
  bitCount,
  errorCount,
  simulatedBER,
  theoreticalBER,
  isPlaying,
  snrMin,
  snrMax,
}) => {
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];
  const sampleQuality = getSampleSizeQuality(errorCount, bitCount);
  const accuracy = getAccuracyAssessment(simulatedBER, theoreticalBER, errorCount);
  const [isSweeping, setIsSweeping] = React.useState(false);
  const [sweepProgress, setSweepProgress] = React.useState<string | null>(null);

  /**
   * Calculate ratio of simulated to theoretical BER.
   * This is the key metric - should converge to ~1.0 with enough samples.
   */
  const berRatio = theoreticalBER > 0 && simulatedBER > 0
    ? (simulatedBER / theoreticalBER).toFixed(2)
    : 'N/A';

  const runSweepAndExport = async () => {
    if (isSweeping || isPlaying) return;
    setIsSweeping(true);
    setSweepProgress('Preparing sweep...');

    const snrStep = SWEEP_STEP_DB;
    const bitsPerPoint = SWEEP_BITS_PER_POINT;
    const points: Array<ReturnType<typeof simulateBerAtSnr>> = [];

    const snrValues: number[] = [];
    for (let snr = snrMin; snr <= snrMax + 1e-6; snr += snrStep) {
      snrValues.push(Math.round(snr * 10) / 10);
    }

    for (let i = 0; i < snrValues.length; i++) {
      const snr = snrValues[i];
      setSweepProgress(`Sweeping ${snr.toFixed(1)} dB (${i + 1}/${snrValues.length})...`);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      points.push(simulateBerAtSnr(scheme, snr, bitsPerPoint));
    }

    const header = ['scheme', 'snr_db', 'theoretical_ber', 'simulated_ber', 'bit_count', 'error_count'];
    const rows = points.map((p) => ([
      scheme,
      p.snrDb.toFixed(1),
      p.theoreticalBER.toExponential(6),
      p.simulatedBER.toExponential(6),
      p.bitCount.toString(),
      p.errorCount.toString(),
    ]));

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ber_sweep_${scheme}_${timestamp}.csv`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSweepProgress(null);
    setIsSweeping(false);
  };

  return (
    <div
      className="rounded-lg p-4 border transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-border)'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          SIMULATION STATISTICS
        </div>
        {/* Running indicator */}
        {isPlaying && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Running</span>
          </div>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Configuration */}
        <StatBox
          label="Modulation"
          value={scheme}
          subtext={`${bitsPerSymbol} bits/symbol`}
          valueClass="text-cyan-400"
        />

        <StatBox
          label="Eb/N0"
          value={`${snrDb.toFixed(1)} dB`}
          subtext="Signal-to-noise ratio"
          valueClass="text-cyan-400"
        />

        {/* Counts */}
        <StatBox
          label="Symbols Tx"
          value={formatNumber(symbolCount)}
          subtext={`${formatNumber(bitCount)} bits`}
          valueClass="text-white"
        />

        <StatBox
          label="Bit Errors"
          value={formatNumber(errorCount)}
          subtext={sampleQuality.level}
          valueClass={errorCount > 0 ? 'text-red-400' : 'text-green-400'}
          subtextClass={sampleQuality.color}
        />

        {/* BER Values */}
        <StatBox
          label="Simulated BER"
          value={formatBER(simulatedBER)}
          subtext="Measured error rate"
          valueClass="text-yellow-400"
          large
        />

        <StatBox
          label="Theoretical BER"
          value={formatBER(theoreticalBER)}
          subtext="Expected error rate"
          valueClass="text-green-400"
          large
        />

        <StatBox
          label="BER Ratio"
          value={berRatio}
          subtext={accuracy.level}
          valueClass={
            berRatio === 'N/A'
              ? 'text-slate-500'
              : accuracy.isGood
                ? 'text-green-400'
                : 'text-red-400'
          }
          subtextClass={accuracy.color}
        />

        {/* Convergence indicator - shows both sample size AND accuracy */}
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Convergence Status</div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
            <div
              className={`h-full transition-all duration-300 ${
                accuracy.isGood && sampleQuality.percentage >= 60 ? 'bg-green-500' :
                sampleQuality.percentage >= 40 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${sampleQuality.percentage}%` }}
            />
          </div>
          <div className={`text-xs mt-1 ${accuracy.isGood ? accuracy.color : 'text-red-400'}`}>
            {errorCount < 100
              ? `Need ${Math.max(0, 100 - errorCount)} more errors for significance`
              : accuracy.isGood
                ? `Ratio ${berRatio} - converging to theory`
                : `Ratio ${berRatio} - outside expected range!`
            }
          </div>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-4 pt-3 border-t text-xs" style={{ borderColor: 'var(--bg-border)', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Key metric:</strong> The BER Ratio (simulated/theoretical)
        should converge to ~1.0 with enough samples. With 100+ errors, expect ratio between 0.8-1.2.
        Ratios far from 1.0 may indicate insufficient samples or simulation issues.
      </div>

      {/* SNR sweep export */}
      <div className="mt-4 pt-3 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Export a BER sweep for the selected scheme (SNR {snrMin} to {snrMax} dB, {SWEEP_STEP_DB} dB steps, {bitsPerPointLabel()} per point).
          {sweepProgress && <span className="ml-2 text-cyan-400">{sweepProgress}</span>}
        </div>
        <button
          onClick={runSweepAndExport}
          disabled={isSweeping || isPlaying}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isSweeping || isPlaying
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
          title={isPlaying ? 'Pause the simulation to run a sweep' : 'Run SNR sweep and export CSV'}
          aria-label="Run SNR sweep and export CSV"
        >
          {isSweeping ? 'Sweeping...' : 'Run SNR Sweep + Export CSV'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * StatBox - Individual statistic display box.
 */
interface StatBoxProps {
  label: string;
  value: string;
  subtext: string;
  valueClass?: string;
  subtextClass?: string;
  large?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  subtext,
  valueClass = 'text-white',
  subtextClass = 'text-slate-500',
  large = false,
}) => (
  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    <div className={`font-mono font-bold ${large ? 'text-xl' : 'text-lg'} ${valueClass}`}>
      {value}
    </div>
    <div className={`text-xs ${subtextClass}`}>{subtext}</div>
  </div>
);

function bitsPerPointLabel(): string {
  return `${SWEEP_BITS_PER_POINT.toLocaleString()} bits`;
}

export default StatisticsPanel;
