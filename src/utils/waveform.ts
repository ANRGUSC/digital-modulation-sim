/**
 * Time-Domain Waveform Generation
 *
 * This module creates time-domain representations of modulated signals
 * for visualization purposes. It generates the baseband I(t) and Q(t)
 * waveforms that students can observe.
 *
 * Key Concepts:
 * =============
 *
 * Baseband vs Passband:
 * - Passband: The actual RF signal at carrier frequency fc
 *   s(t) = I(t)·cos(2πfc·t) - Q(t)·sin(2πfc·t)
 * - Baseband: The complex envelope (what we visualize)
 *   x(t) = I(t) + j·Q(t)
 *
 * We show baseband signals because:
 * - Carrier frequencies are too high to visualize meaningfully
 * - The baseband signal contains all the information
 * - This is how signals are processed in SDR (Software Defined Radio)
 *
 * Pulse Shaping:
 * - Each symbol is transmitted as a pulse of duration T (symbol period)
 * - Rectangular pulse: simple, sharp transitions
 * - Raised cosine: smoother, reduced bandwidth, less ISI
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import type { Complex, WaveformData } from '../types';

// =============================================================================
// WAVEFORM CONFIGURATION
// =============================================================================

/**
 * Default samples per symbol for waveform display.
 *
 * Higher values = smoother curves but more computation.
 * 16-32 samples is typically sufficient for visual clarity.
 */
export const DEFAULT_SAMPLES_PER_SYMBOL = 20;

/**
 * Pulse shaping options.
 *
 * RECTANGULAR: Sharp transitions at symbol boundaries
 *   - Simple to understand and implement
 *   - Infinite bandwidth (sinc in frequency domain)
 *   - Clear symbol boundaries visible in waveform
 *
 * RAISED_COSINE: Smooth transitions with controlled bandwidth
 *   - Used in practical systems to limit bandwidth
 *   - Reduces Inter-Symbol Interference (ISI)
 *   - Roll-off factor α controls bandwidth/transition trade-off
 */
export type PulseShape = 'RECTANGULAR' | 'RAISED_COSINE';

// =============================================================================
// WAVEFORM GENERATION
// =============================================================================

/**
 * Generates time-domain waveform data from a sequence of symbols.
 *
 * Creates sampled I(t) and Q(t) waveforms suitable for plotting.
 *
 * For each symbol, we generate `samplesPerSymbol` points that represent
 * the transmitted signal value during that symbol period.
 *
 * Time Axis:
 * - Normalized to symbol periods (T = 1)
 * - t = 0 is the start of the first symbol
 * - t = N is the end of the last symbol (N symbols total)
 *
 * @param symbols - Array of complex symbols to convert to waveform
 * @param samplesPerSymbol - Number of samples per symbol period (default: 20)
 * @param pulseShape - Pulse shaping method (default: RECTANGULAR)
 * @returns WaveformData with time, I, and Q arrays
 */
export function generateWaveform(
  symbols: Complex[],
  samplesPerSymbol: number = DEFAULT_SAMPLES_PER_SYMBOL,
  pulseShape: PulseShape = 'RECTANGULAR'
): WaveformData {
  const numSymbols = symbols.length;
  const totalSamples = numSymbols * samplesPerSymbol;

  // Initialize output arrays
  const t: number[] = new Array(totalSamples);
  const I: number[] = new Array(totalSamples);
  const Q: number[] = new Array(totalSamples);

  // Time step between samples (in symbol periods)
  const dt = 1 / samplesPerSymbol;

  // Generate samples for each symbol
  for (let symIdx = 0; symIdx < numSymbols; symIdx++) {
    const symbol = symbols[symIdx];

    // Samples for this symbol
    for (let sampleIdx = 0; sampleIdx < samplesPerSymbol; sampleIdx++) {
      const globalIdx = symIdx * samplesPerSymbol + sampleIdx;

      // Time value for this sample (in symbol periods)
      // Sample is at the middle of its time slot for better visualization
      t[globalIdx] = symIdx + sampleIdx * dt;

      // Apply pulse shaping
      if (pulseShape === 'RECTANGULAR') {
        // Rectangular pulse: constant value throughout symbol period
        I[globalIdx] = symbol.I;
        Q[globalIdx] = symbol.Q;
      } else {
        // Raised cosine pulse shaping
        // (Simplified: full implementation would require convolution with neighbors)
        const pulseValue = raisedCosinePulse(sampleIdx * dt, 0.5);
        I[globalIdx] = symbol.I * pulseValue;
        Q[globalIdx] = symbol.Q * pulseValue;
      }
    }
  }

  return { t, I, Q };
}

/**
 * Generates waveform with smooth transitions between symbols.
 *
 * Instead of sharp rectangular pulses, this creates smooth transitions
 * using interpolation. This is closer to what a real filtered signal
 * looks like.
 *
 * @param symbols - Array of complex symbols
 * @param samplesPerSymbol - Samples per symbol period
 * @param rollOff - Transition smoothness (0 = sharp, 1 = very smooth)
 * @returns WaveformData with smoothed transitions
 */
export function generateSmoothWaveform(
  symbols: Complex[],
  samplesPerSymbol: number = DEFAULT_SAMPLES_PER_SYMBOL,
  rollOff: number = 0.3
): WaveformData {
  const numSymbols = symbols.length;
  const totalSamples = numSymbols * samplesPerSymbol;

  const t: number[] = new Array(totalSamples);
  const I: number[] = new Array(totalSamples);
  const Q: number[] = new Array(totalSamples);

  const dt = 1 / samplesPerSymbol;

  // Number of samples for transition region
  const transitionSamples = Math.floor(samplesPerSymbol * rollOff / 2);

  for (let symIdx = 0; symIdx < numSymbols; symIdx++) {
    const currentSymbol = symbols[symIdx];
    const prevSymbol = symIdx > 0 ? symbols[symIdx - 1] : currentSymbol;

    for (let sampleIdx = 0; sampleIdx < samplesPerSymbol; sampleIdx++) {
      const globalIdx = symIdx * samplesPerSymbol + sampleIdx;
      t[globalIdx] = symIdx + sampleIdx * dt;

      if (sampleIdx < transitionSamples && symIdx > 0) {
        // Transition from previous symbol
        // Use raised cosine interpolation
        const alpha = 0.5 * (1 + Math.cos(Math.PI * (transitionSamples - sampleIdx) / transitionSamples));
        I[globalIdx] = prevSymbol.I * (1 - alpha) + currentSymbol.I * alpha;
        Q[globalIdx] = prevSymbol.Q * (1 - alpha) + currentSymbol.Q * alpha;
      } else {
        // Steady state
        I[globalIdx] = currentSymbol.I;
        Q[globalIdx] = currentSymbol.Q;
      }
    }
  }

  return { t, I, Q };
}

// =============================================================================
// PULSE SHAPING FUNCTIONS
// =============================================================================

/**
 * Raised Cosine pulse shape function.
 *
 * The raised cosine filter is the industry-standard pulse shape because:
 * 1. Zero ISI at symbol sampling points (Nyquist criterion)
 * 2. Controlled bandwidth (excess bandwidth = roll-off factor α)
 * 3. Smooth time-domain shape
 *
 * p(t) = sinc(t/T) × cos(πα·t/T) / (1 - (2α·t/T)²)
 *
 * where:
 *   T = symbol period
 *   α = roll-off factor (0 ≤ α ≤ 1)
 *
 * Roll-off factor α:
 *   α = 0: Ideal sinc pulse (infinite duration, minimum bandwidth)
 *   α = 1: Maximum smoothing (double bandwidth, fastest decay)
 *   α = 0.2-0.5: Typical values in practice
 *
 * @param t - Time offset from symbol center (in symbol periods)
 * @param alpha - Roll-off factor (0 to 1)
 * @returns Pulse amplitude at time t
 */
export function raisedCosinePulse(t: number, alpha: number = 0.5): number {
  // Handle special case at t = 0
  if (Math.abs(t) < 1e-10) {
    return 1;
  }

  // Handle special case at t = ±1/(2α) where denominator goes to zero
  const specialPoint = 1 / (2 * alpha);
  if (alpha > 0 && Math.abs(Math.abs(t) - specialPoint) < 1e-10) {
    return (Math.PI / 4) * sinc(specialPoint);
  }

  // General case: sinc(t) × cos(πα·t) / (1 - (2α·t)²)
  const sincTerm = sinc(t);
  const cosTerm = Math.cos(Math.PI * alpha * t);
  const denominator = 1 - Math.pow(2 * alpha * t, 2);

  // Avoid division by very small numbers
  if (Math.abs(denominator) < 1e-10) {
    return sincTerm * cosTerm;
  }

  return sincTerm * cosTerm / denominator;
}

/**
 * Sinc function: sinc(x) = sin(πx) / (πx)
 *
 * The ideal low-pass filter impulse response.
 * Key property: sinc(n) = 0 for all non-zero integers n
 * This is why it achieves zero ISI at symbol sampling points.
 *
 * @param x - Input value
 * @returns sinc(x)
 */
export function sinc(x: number): number {
  if (Math.abs(x) < 1e-10) {
    return 1; // lim(x→0) sin(πx)/(πx) = 1
  }
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

// =============================================================================
// WAVEFORM UTILITIES
// =============================================================================

/**
 * Adds noise to waveform samples for received signal visualization.
 *
 * @param waveform - Original waveform data
 * @param noiseStdDev - Standard deviation of Gaussian noise
 * @returns New WaveformData with added noise
 */
export function addNoiseToWaveformData(
  waveform: WaveformData,
  noiseStdDev: number
): WaveformData {
  const noisyI = waveform.I.map(sample => {
    const u1 = Math.max(Math.random(), 1e-10);
    const u2 = Math.random();
    const noise = noiseStdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return sample + noise;
  });

  const noisyQ = waveform.Q.map(sample => {
    const u1 = Math.max(Math.random(), 1e-10);
    const u2 = Math.random();
    const noise = noiseStdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return sample + noise;
  });

  return {
    t: [...waveform.t],  // Time axis doesn't change
    I: noisyI,
    Q: noisyQ,
  };
}

/**
 * Gets symbol boundaries for waveform plotting.
 *
 * Returns time values where symbol transitions occur.
 * Useful for drawing vertical dashed lines on waveform plots.
 *
 * @param numSymbols - Number of symbols in the waveform
 * @returns Array of time values at symbol boundaries
 */
export function getSymbolBoundaries(numSymbols: number): number[] {
  const boundaries: number[] = [];
  for (let i = 0; i <= numSymbols; i++) {
    boundaries.push(i);
  }
  return boundaries;
}

/**
 * Extracts symbol values from waveform at optimal sampling points.
 *
 * In a real receiver, we sample at the center of each symbol period
 * where the eye diagram is most open (maximum margin from ISI).
 *
 * @param waveform - Waveform data
 * @param samplesPerSymbol - Samples per symbol period
 * @returns Array of complex values sampled at symbol centers
 */
export function sampleWaveformAtSymbolCenters(
  waveform: WaveformData,
  samplesPerSymbol: number
): Complex[] {
  const numSymbols = Math.floor(waveform.I.length / samplesPerSymbol);
  const samples: Complex[] = [];

  // Sample at the center of each symbol period
  const centerOffset = Math.floor(samplesPerSymbol / 2);

  for (let i = 0; i < numSymbols; i++) {
    const idx = i * samplesPerSymbol + centerOffset;
    samples.push({
      I: waveform.I[idx],
      Q: waveform.Q[idx],
    });
  }

  return samples;
}

/**
 * Creates bit labels for waveform display.
 *
 * Groups bits according to the modulation scheme and creates
 * position information for displaying above the waveform.
 *
 * @param bits - Array of bits
 * @param bitsPerSymbol - Bits per symbol for current modulation
 * @param samplesPerSymbol - Samples per symbol (for positioning)
 * @returns Array of {position, label} for rendering
 */
export function createBitLabels(
  bits: number[],
  bitsPerSymbol: number,
  samplesPerSymbol: number = DEFAULT_SAMPLES_PER_SYMBOL
): Array<{ position: number; label: string }> {
  const labels: Array<{ position: number; label: string }> = [];

  for (let i = 0; i + bitsPerSymbol <= bits.length; i += bitsPerSymbol) {
    const symbolIndex = i / bitsPerSymbol;
    const bitGroup = bits.slice(i, i + bitsPerSymbol).join('');

    labels.push({
      position: (symbolIndex + 0.5) * samplesPerSymbol, // Center of symbol
      label: bitGroup,
    });
  }

  return labels;
}
