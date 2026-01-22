/**
 * SNR (Eb/N0) Slider Component
 *
 * Provides a slider control for adjusting the Signal-to-Noise Ratio,
 * specifically Eb/N0 (Energy per bit to Noise spectral density ratio).
 *
 * Educational Notes:
 * ==================
 *
 * Eb/N0 is the fundamental SNR metric in digital communications:
 * - Eb = energy per information bit
 * - N0 = one-sided noise power spectral density
 * - Measured in dB: 10 × log10(Eb/N0_linear)
 *
 * Typical values:
 * - Eb/N0 < 0 dB: Very poor channel, high error rates
 * - Eb/N0 ≈ 5-10 dB: Moderate conditions, depends on modulation
 * - Eb/N0 > 15 dB: Good conditions, low error rates
 *
 * The slider range (-5 to 25 dB) covers:
 * - Low SNR: See how noise overwhelms the signal
 * - Medium SNR: Observe the transition region
 * - High SNR: See clean constellation with few errors
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React from 'react';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface SNRSliderProps {
  /** Current Eb/N0 value in dB */
  value: number;
  /** Callback when user changes the SNR */
  onChange: (value: number) => void;
  /** Minimum SNR value (default: -5 dB) */
  min?: number;
  /** Maximum SNR value (default: 25 dB) */
  max?: number;
  /** Step size (default: 0.5 dB) */
  step?: number;
  /** Whether the slider is disabled */
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SNRSlider Component
 *
 * Renders a horizontal slider for Eb/N0 adjustment with visual feedback
 * showing the current value and quality indicators.
 */
export const SNRSlider: React.FC<SNRSliderProps> = ({
  value,
  onChange,
  min = -5,
  max = 25,
  step = 0.5,
  disabled = false,
}) => {
  /**
   * Calculate the percentage position for visual indicators.
   */
  const percentage = ((value - min) / (max - min)) * 100;

  /**
   * Determine quality indicator based on SNR value.
   * This gives students intuition about what SNR values mean.
   */
  const getQualityIndicator = (snr: number): { label: string; color: string } => {
    if (snr < 0) return { label: 'Very Poor', color: 'text-red-400' };
    if (snr < 5) return { label: 'Poor', color: 'text-orange-400' };
    if (snr < 10) return { label: 'Moderate', color: 'text-yellow-400' };
    if (snr < 15) return { label: 'Good', color: 'text-lime-400' };
    return { label: 'Excellent', color: 'text-green-400' };
  };

  const quality = getQualityIndicator(value);

  const presets = [
    { label: 'Low', value: 0 },
    { label: 'Medium', value: 8 },
    { label: 'High', value: 14 },
    { label: 'Very High', value: 20 },
  ].filter((preset) => preset.value >= min && preset.value <= max);

  return (
    <div
      className="rounded-lg p-4 border transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-border)'
      }}
    >
      {/* Header with current value */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }} id="snr-label">
          SNR (Eb/N0)
        </div>
        <div className="flex items-center gap-2">
          {/* Quality indicator */}
          <span className={`text-xs ${quality.color}`}>
            {quality.label}
          </span>
          {/* Current value display */}
          <span className="font-mono text-lg text-cyan-400 font-bold min-w-[4rem] text-right">
            {value.toFixed(1)} dB
          </span>
        </div>
      </div>

      {/* Slider Track */}
      <div className="relative pt-1">
        {/* Background track */}
        <div className="relative h-2 bg-slate-700 rounded-full">
          {/* Filled portion */}
          <div
            className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Actual range input (invisible but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="absolute top-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label="SNR Eb/N0 in dB"
          aria-labelledby="snr-label"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value.toFixed(1)} decibels`}
          title="Adjust the Signal-to-Noise Ratio (Eb/N0). Higher values = cleaner signal with fewer errors. Lower values = more noise and bit errors."
        />

        {/* Custom thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-500 transition-all duration-150 pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>{min} dB</span>
        <span>|</span>
        <span>|</span>
        <span>|</span>
        <span>{max} dB</span>
      </div>

      {/* Preset buttons */}
      {presets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => {
            const isActive = Math.abs(value - preset.value) < 0.01;
            return (
              <button
                key={preset.label}
                onClick={() => onChange(preset.value)}
                disabled={disabled}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  disabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : isActive
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                title={`Set SNR to ${preset.value} dB`}
                aria-pressed={isActive}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Educational note */}
      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Eb/N0</span> = Energy per bit / Noise spectral density.
        {' '}Higher values = less noise = fewer errors.
      </div>
    </div>
  );
};

export default SNRSlider;
