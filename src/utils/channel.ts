/**
 * Channel Models for Digital Communications
 *
 * This module implements channel effects, primarily focusing on the
 * Additive White Gaussian Noise (AWGN) channel model.
 *
 * The AWGN Channel:
 * ================
 * The AWGN channel is the fundamental model for thermal noise in communication
 * systems. The received signal is:
 *
 *   r(t) = s(t) + n(t)
 *
 * where:
 *   - s(t) is the transmitted signal
 *   - n(t) is white Gaussian noise with power spectral density N₀/2
 *
 * Key properties of AWGN:
 *   - Additive: Noise adds to the signal (doesn't multiply)
 *   - White: Flat power spectrum (equal power at all frequencies)
 *   - Gaussian: Amplitude follows normal distribution
 *
 * Why Gaussian?
 *   - Thermal noise (Johnson-Nyquist noise) in resistors is Gaussian
 *   - Central Limit Theorem: Sum of many random effects → Gaussian
 *   - Mathematically tractable for analysis
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import type { Complex, ModulationScheme } from '../types';
import { BITS_PER_SYMBOL } from '../types';
import { dbToLinear, complexGaussianRandom, complexAdd } from './math';

// =============================================================================
// SIGNAL-TO-NOISE RATIO (SNR)
// =============================================================================

/**
 * Calculates the noise variance (power) for a given Eb/N0.
 *
 * SNR Definitions in Digital Communications:
 * ==========================================
 *
 * Eb/N0 (Energy per bit to noise spectral density ratio):
 *   - The most fundamental SNR measure for digital communications
 *   - Eb = energy per information bit
 *   - N0 = noise power spectral density (W/Hz)
 *   - Allows fair comparison between modulation schemes with different bit rates
 *
 * Es/N0 (Energy per symbol to noise spectral density ratio):
 *   - Es = energy per symbol
 *   - Es = Eb × (bits per symbol)
 *   - More directly related to constellation geometry
 *
 * Relationship:
 *   Es/N0 (dB) = Eb/N0 (dB) + 10×log10(bits_per_symbol)
 *
 * For our normalized constellations (average symbol energy = 1):
 *   Noise variance σ² = N0/2 per dimension = 1/(2×Es/N0_linear)
 *
 * @param ebN0Db - Eb/N0 in decibels
 * @param scheme - Modulation scheme (needed for bits per symbol)
 * @returns Noise variance (σ²) per I/Q dimension
 */
export function calculateNoiseVariance(ebN0Db: number, scheme: ModulationScheme): number {
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];

  // Convert Eb/N0 from dB to linear scale
  const ebN0Linear = dbToLinear(ebN0Db);

  // Convert to Es/N0: Es = Eb × k where k = bits per symbol
  const esN0Linear = ebN0Linear * bitsPerSymbol;

  // For complex AWGN with normalized symbols (Es = 1):
  // Total noise power = N0 = 1/esN0Linear (since Es = 1)
  // Per-dimension variance = N0/2 = 1/(2×esN0Linear)
  //
  // Actually, for baseband complex noise, we want total noise variance = N0
  // So noise variance per dimension = N0/2 = 1/(2 × Es/N0)
  //
  // But we're using complexGaussianRandom which takes total variance,
  // so we return the total noise variance = N0 = 1/esN0Linear
  const noiseVariance = 1 / esN0Linear;

  return noiseVariance;
}

/**
 * Calculates the noise standard deviation per I/Q component.
 *
 * This is useful for visualizing noise on waveforms.
 * The noise on each I/Q component has standard deviation σ = √(N0/2).
 *
 * @param ebN0Db - Eb/N0 in decibels
 * @param scheme - Modulation scheme
 * @returns Standard deviation σ for each I/Q component
 */
export function calculateNoiseStdDev(ebN0Db: number, scheme: ModulationScheme): number {
  const noiseVariance = calculateNoiseVariance(ebN0Db, scheme);
  // Each I/Q component gets half the total noise variance
  return Math.sqrt(noiseVariance / 2);
}

// =============================================================================
// AWGN CHANNEL IMPLEMENTATION
// =============================================================================

/**
 * Adds Additive White Gaussian Noise (AWGN) to transmitted symbols.
 *
 * This simulates the effect of the noisy channel on the transmitted signal.
 * Each received symbol is:
 *
 *   r = s + n
 *
 * where:
 *   - s is the transmitted symbol (complex)
 *   - n is complex Gaussian noise with variance determined by SNR
 *   - r is the received symbol (complex)
 *
 * The noise is circularly symmetric complex Gaussian (CSCG):
 *   - Real and imaginary parts are independent
 *   - Each has variance σ²/2 where σ² is the total noise variance
 *   - This models thermal noise in baseband I/Q representation
 *
 * Visual effect:
 *   - At high SNR: received symbols cluster tightly around ideal points
 *   - At low SNR: received symbols scatter widely, crossing decision boundaries
 *
 * @param symbols - Array of transmitted symbols
 * @param ebN0Db - Channel Eb/N0 in decibels
 * @param scheme - Modulation scheme (for SNR calculation)
 * @returns Array of received symbols with added noise
 */
export function addAWGN(
  symbols: Complex[],
  ebN0Db: number,
  scheme: ModulationScheme
): Complex[] {
  // Calculate the noise variance based on SNR
  const noiseVariance = calculateNoiseVariance(ebN0Db, scheme);

  // Add independent complex Gaussian noise to each symbol
  return symbols.map(symbol => {
    // Generate complex Gaussian noise with the calculated variance
    const noise = complexGaussianRandom(noiseVariance);

    // Received signal = transmitted + noise
    return complexAdd(symbol, noise);
  });
}

/**
 * Adds AWGN to a single symbol.
 *
 * Convenience function for processing symbols one at a time.
 *
 * @param symbol - Single transmitted symbol
 * @param ebN0Db - Channel Eb/N0 in decibels
 * @param scheme - Modulation scheme
 * @returns Received symbol with added noise
 */
export function addAWGNToSymbol(
  symbol: Complex,
  ebN0Db: number,
  scheme: ModulationScheme
): Complex {
  const noiseVariance = calculateNoiseVariance(ebN0Db, scheme);
  const noise = complexGaussianRandom(noiseVariance);
  return complexAdd(symbol, noise);
}

// =============================================================================
// WAVEFORM NOISE
// =============================================================================

/**
 * Adds noise to time-domain waveform samples.
 *
 * For realistic waveform display, we add noise to each sample point.
 * The noise is Gaussian with variance that matches the SNR.
 *
 * Note: In a real system, noise is continuous. Here we add independent
 * noise samples at each discrete time point. This is a simplification
 * but visually represents the effect of noise on the waveform.
 *
 * @param samples - Array of sample values (I or Q component)
 * @param noiseStdDev - Standard deviation of noise to add
 * @returns Array of noisy samples
 */
export function addNoiseToWaveform(samples: number[], noiseStdDev: number): number[] {
  return samples.map(sample => {
    // Add Gaussian noise with mean 0 and given standard deviation
    const u1 = Math.max(Math.random(), 1e-10);
    const u2 = Math.random();
    const noise = noiseStdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return sample + noise;
  });
}

// =============================================================================
// CHANNEL STATISTICS
// =============================================================================

/**
 * Calculates the expected signal-to-noise ratio at the receiver.
 *
 * For normalized constellations (average symbol energy = 1):
 *   - Signal power = 1
 *   - Noise power = σ² (total variance)
 *   - SNR = 1/σ² = Es/N0
 *
 * @param ebN0Db - Eb/N0 in decibels
 * @param scheme - Modulation scheme
 * @returns Actual SNR (Es/N0) in dB
 */
export function calculateEsN0(ebN0Db: number, scheme: ModulationScheme): number {
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];
  // Es/N0 (dB) = Eb/N0 (dB) + 10×log10(bits_per_symbol)
  return ebN0Db + 10 * Math.log10(bitsPerSymbol);
}

/**
 * Converts Es/N0 to Eb/N0.
 *
 * Eb/N0 (dB) = Es/N0 (dB) - 10×log10(bits_per_symbol)
 *
 * @param esN0Db - Es/N0 in decibels
 * @param scheme - Modulation scheme
 * @returns Eb/N0 in dB
 */
export function esN0ToEbN0(esN0Db: number, scheme: ModulationScheme): number {
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];
  return esN0Db - 10 * Math.log10(bitsPerSymbol);
}
