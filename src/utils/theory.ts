/**
 * Theoretical Performance Analysis for Digital Modulation
 *
 * This module provides closed-form expressions for Bit Error Rate (BER)
 * and Symbol Error Rate (SER) for various modulation schemes over AWGN channels.
 *
 * These formulas allow us to:
 * 1. Compare simulated results against theory (validation)
 * 2. Quickly generate theoretical BER curves
 * 3. Understand the performance limits of each modulation scheme
 *
 * Key insight: Higher order modulation (more bits/symbol) achieves higher
 * data rates but requires higher SNR for the same BER.
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import type { ModulationScheme } from '../types';
import { BITS_PER_SYMBOL } from '../types';
import { qFunction, dbToLinear } from './math';

// =============================================================================
// THEORETICAL BER FORMULAS
// =============================================================================

/**
 * Calculates the theoretical Bit Error Rate (BER) for a given modulation
 * scheme and Eb/N0.
 *
 * BER = (Number of bit errors) / (Total bits transmitted)
 *
 * For each modulation scheme, we use closed-form approximations that are
 * accurate under the assumption of:
 * - AWGN channel
 * - Perfect synchronization
 * - Gray coding (for QAM and PSK)
 *
 * Note: Some formulas are approximations that are tight at moderate-to-high SNR.
 *
 * @param scheme - Modulation scheme
 * @param ebN0Db - Eb/N0 in decibels
 * @returns Theoretical bit error probability
 */
export function theoreticalBER(scheme: ModulationScheme, ebN0Db: number): number {
  // Convert Eb/N0 from dB to linear scale
  const ebN0 = dbToLinear(ebN0Db);

  switch (scheme) {
    case 'BPSK':
      return berBPSK(ebN0);
    case 'QPSK':
      return berQPSK(ebN0);
    case '8-PSK':
      return ber8PSK(ebN0);
    case '16-QAM':
      return ber16QAM(ebN0);
    case '64-QAM':
      return ber64QAM(ebN0);
    default:
      throw new Error(`Unknown modulation scheme: ${scheme}`);
  }
}

/**
 * BPSK Bit Error Rate
 *
 * Pb = Q(√(2·Eb/N0))
 *
 * BPSK is the most robust modulation scheme because:
 * - Maximum distance between constellation points for given energy
 * - Simple decision: compare received signal to zero threshold
 *
 * Derivation:
 * - Symbols at ±√Eb
 * - Decision threshold at 0
 * - Error occurs when noise > √Eb or < -√Eb
 * - P(error) = Q(√(2Eb/N0)) [after normalizing]
 *
 * @param ebN0 - Eb/N0 in linear scale
 * @returns Bit error probability
 */
function berBPSK(ebN0: number): number {
  // Pb = Q(√(2·Eb/N0))
  return qFunction(Math.sqrt(2 * ebN0));
}

/**
 * QPSK Bit Error Rate
 *
 * Pb = Q(√(2·Eb/N0))
 *
 * Remarkable result: QPSK has the SAME BER as BPSK!
 * This is because:
 * - QPSK uses two orthogonal carriers (I and Q)
 * - Each carrier independently carries 1 bit with BPSK-like performance
 * - The quadrature channels don't interfere with each other
 *
 * So QPSK achieves 2× the data rate of BPSK with identical BER performance.
 * This is why QPSK is so widely used!
 *
 * Note: This assumes Gray coding. With natural binary coding, BER would be
 * worse because a symbol error could cause 2 bit errors.
 *
 * @param ebN0 - Eb/N0 in linear scale
 * @returns Bit error probability
 */
function berQPSK(ebN0: number): number {
  // Same as BPSK when using Gray coding
  return qFunction(Math.sqrt(2 * ebN0));
}

/**
 * 8-PSK Bit Error Rate (Approximation)
 *
 * For M-PSK with Gray coding:
 * Pb ≈ (2/log2(M)) × Q(√(2·log2(M)·Eb/N0) × sin(π/M))
 *
 * For 8-PSK (M=8, log2(M)=3):
 * Pb ≈ (2/3) × Q(√(6·Eb/N0) × sin(π/8))
 *
 * 8-PSK performance is worse than QPSK because:
 * - 8 points on unit circle means smaller angular separation (45° vs 90°)
 * - Closer constellation points → higher error probability
 * - Trade-off: 50% higher bit rate (3 vs 2 bits/symbol)
 *
 * @param ebN0 - Eb/N0 in linear scale
 * @returns Bit error probability (approximate)
 */
function ber8PSK(ebN0: number): number {
  const M = 8;
  const k = 3;  // log2(8) = 3 bits per symbol

  // sin(π/8) = sin(22.5°) ≈ 0.3827
  const sinPiOverM = Math.sin(Math.PI / M);

  // Argument to Q function
  const arg = Math.sqrt(2 * k * ebN0) * sinPiOverM;

  // Pb ≈ (2/k) × Q(arg)
  return (2 / k) * qFunction(arg);
}

/**
 * 16-QAM Bit Error Rate (Approximation)
 *
 * For square M-QAM with Gray coding:
 * Pb ≈ (4/k) × (1 - 1/√M) × Q(√(3k·Eb/N0 / (M-1)))
 *
 * For 16-QAM (M=16, k=4, √M=4):
 * Pb ≈ (3/4) × Q(√((4/5)·Eb/N0))
 *
 * Simplified: Pb ≈ 0.75 × Q(√(0.8·Eb/N0))
 *
 * 16-QAM trades noise immunity for higher data rate:
 * - 4 bits per symbol (vs 2 for QPSK)
 * - Requires ~4 dB higher SNR for same BER as QPSK
 *
 * @param ebN0 - Eb/N0 in linear scale
 * @returns Bit error probability (approximate)
 */
function ber16QAM(ebN0: number): number {
  const M = 16;
  const k = 4;  // log2(16) = 4 bits per symbol
  const sqrtM = 4;

  // Factor: (4/k) × (1 - 1/√M) = (4/4) × (1 - 1/4) = 3/4
  const factor = (4 / k) * (1 - 1 / sqrtM);

  // Argument to Q: √(3k·Eb/N0 / (M-1)) = √(12·Eb/N0 / 15) = √(0.8·Eb/N0)
  const arg = Math.sqrt((3 * k * ebN0) / (M - 1));

  return factor * qFunction(arg);
}

/**
 * 64-QAM Bit Error Rate (Approximation)
 *
 * Using the same M-QAM formula:
 * Pb ≈ (4/k) × (1 - 1/√M) × Q(√(3k·Eb/N0 / (M-1)))
 *
 * For 64-QAM (M=64, k=6, √M=8):
 * Pb ≈ (4/6) × (1 - 1/8) × Q(√(18·Eb/N0 / 63))
 *    = (7/12) × Q(√((2/7)·Eb/N0))
 *
 * 64-QAM is used when SNR is high:
 * - 6 bits per symbol
 * - Requires ~6 dB higher SNR than 16-QAM for same BER
 * - Common in cable modems, high-rate WiFi
 *
 * @param ebN0 - Eb/N0 in linear scale
 * @returns Bit error probability (approximate)
 */
function ber64QAM(ebN0: number): number {
  const M = 64;
  const k = 6;  // log2(64) = 6 bits per symbol
  const sqrtM = 8;

  // Factor: (4/k) × (1 - 1/√M) = (4/6) × (1 - 1/8) = (2/3) × (7/8) = 7/12
  const factor = (4 / k) * (1 - 1 / sqrtM);

  // Argument to Q: √(3k·Eb/N0 / (M-1)) = √(18·Eb/N0 / 63)
  const arg = Math.sqrt((3 * k * ebN0) / (M - 1));

  return factor * qFunction(arg);
}

// =============================================================================
// THEORETICAL SER FORMULAS
// =============================================================================

/**
 * Calculates the theoretical Symbol Error Rate (SER).
 *
 * SER = (Number of symbol errors) / (Total symbols transmitted)
 *
 * Relationship to BER (with Gray coding):
 * - In the high-SNR regime: BER ≈ SER / k  (where k = bits per symbol)
 * - This is because most symbol errors are to adjacent symbols (1 bit error)
 * - With Gray coding, adjacent symbols differ by only 1 bit
 *
 * @param scheme - Modulation scheme
 * @param ebN0Db - Eb/N0 in decibels
 * @returns Theoretical symbol error probability
 */
export function theoreticalSER(scheme: ModulationScheme, ebN0Db: number): number {
  const ebN0 = dbToLinear(ebN0Db);
  const bitsPerSymbol = BITS_PER_SYMBOL[scheme];

  // Convert to Es/N0
  const esN0 = ebN0 * bitsPerSymbol;

  switch (scheme) {
    case 'BPSK':
      // SER = BER for BPSK (1 bit = 1 symbol)
      return qFunction(Math.sqrt(2 * ebN0));

    case 'QPSK':
      // For QPSK: Ps = 1 - (1 - Pb)² ≈ 2Pb for small Pb
      // More precisely: Ps = 2Q(√(Es/N0)) - Q²(√(Es/N0))
      const pb = qFunction(Math.sqrt(esN0));
      return 2 * pb - pb * pb;

    case '8-PSK':
      // For M-PSK: Ps ≈ 2Q(√(2·Es/N0)·sin(π/M))
      return 2 * qFunction(Math.sqrt(2 * esN0) * Math.sin(Math.PI / 8));

    case '16-QAM':
      // For square M-QAM: Ps ≈ 4(1-1/√M)Q(√(3Es/N0/(M-1)))
      return serMQAM(16, esN0);

    case '64-QAM':
      return serMQAM(64, esN0);

    default:
      throw new Error(`Unknown modulation scheme: ${scheme}`);
  }
}

/**
 * SER formula for square M-QAM
 *
 * Ps ≈ 1 - (1 - 2(1-1/√M)Q(√(3Es/N0/(M-1))))²
 *
 * Or approximately:
 * Ps ≈ 4(1-1/√M)Q(√(3Es/N0/(M-1))) for high SNR
 *
 * @param M - Constellation size (must be perfect square: 4, 16, 64, ...)
 * @param esN0 - Es/N0 in linear scale
 * @returns Symbol error probability
 */
function serMQAM(M: number, esN0: number): number {
  const sqrtM = Math.sqrt(M);
  const pSqrtM = 2 * (1 - 1 / sqrtM) * qFunction(Math.sqrt(3 * esN0 / (M - 1)));

  // Ps = 1 - (1-pSqrtM)²
  return 1 - Math.pow(1 - pSqrtM, 2);
}

// =============================================================================
// BER CURVE GENERATION
// =============================================================================

/**
 * Generates theoretical BER data points for plotting.
 *
 * Creates an array of (Eb/N0, BER) pairs for drawing smooth theoretical
 * BER curves on a semi-log plot.
 *
 * @param scheme - Modulation scheme
 * @param snrMin - Minimum Eb/N0 in dB
 * @param snrMax - Maximum Eb/N0 in dB
 * @param numPoints - Number of points to generate
 * @returns Array of {snrDb, ber} data points
 */
export function generateTheoreticalBERCurve(
  scheme: ModulationScheme,
  snrMin: number = 0,
  snrMax: number = 20,
  numPoints: number = 100
): Array<{ snrDb: number; ber: number }> {
  const points: Array<{ snrDb: number; ber: number }> = [];
  const step = (snrMax - snrMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const snrDb = snrMin + i * step;
    const ber = theoreticalBER(scheme, snrDb);

    // Only include points where BER is reasonable (> 10^-8)
    if (ber > 1e-8) {
      points.push({ snrDb, ber });
    }
  }

  return points;
}

// =============================================================================
// PERFORMANCE ANALYSIS HELPERS
// =============================================================================

/**
 * Calculates the required Eb/N0 to achieve a target BER.
 *
 * Uses binary search to find the SNR that achieves the desired BER.
 * Useful for link budget calculations: "What SNR do I need for 10^-5 BER?"
 *
 * @param scheme - Modulation scheme
 * @param targetBER - Desired bit error rate
 * @returns Required Eb/N0 in dB
 */
export function requiredEbN0ForBER(scheme: ModulationScheme, targetBER: number): number {
  // Binary search for the required Eb/N0
  let low = -10;   // dB
  let high = 30;   // dB

  // Check if target is achievable
  if (theoreticalBER(scheme, high) > targetBER) {
    return Infinity; // Target too low for this SNR range
  }
  if (theoreticalBER(scheme, low) < targetBER) {
    return low; // Already achieved at minimum SNR
  }

  // Binary search
  while (high - low > 0.01) {
    const mid = (low + high) / 2;
    const ber = theoreticalBER(scheme, mid);

    if (ber > targetBER) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Compares the SNR penalty between two modulation schemes.
 *
 * Returns how much additional Eb/N0 (in dB) is needed for the higher-order
 * modulation to achieve the same BER as the lower-order one.
 *
 * Example: 16-QAM vs QPSK at BER=10^-5
 * "16-QAM requires X dB more SNR than QPSK for the same BER"
 *
 * @param scheme1 - Reference modulation scheme
 * @param scheme2 - Comparison modulation scheme
 * @param targetBER - BER at which to compare
 * @returns SNR difference in dB (positive means scheme2 needs more SNR)
 */
export function snrPenalty(
  scheme1: ModulationScheme,
  scheme2: ModulationScheme,
  targetBER: number = 1e-5
): number {
  const snr1 = requiredEbN0ForBER(scheme1, targetBER);
  const snr2 = requiredEbN0ForBER(scheme2, targetBER);
  return snr2 - snr1;
}

/**
 * Gets the maximum useful SNR for BER curve display.
 *
 * Returns the Eb/N0 at which BER becomes negligible (10^-6),
 * useful for setting slider and plot limits.
 *
 * @param scheme - Modulation scheme
 * @returns Maximum useful Eb/N0 in dB
 */
export function getMaxUsefulSnr(scheme: ModulationScheme): number {
  // Find SNR where BER = 10^-6 (considered negligible for display)
  const targetBER = 1e-6;
  const snr = requiredEbN0ForBER(scheme, targetBER);

  // Add small margin and round to nearest 0.5
  const snrWithMargin = snr + 1;
  return Math.ceil(snrWithMargin * 2) / 2;
}

/**
 * Gets a descriptive summary of a modulation scheme's characteristics.
 *
 * Useful for educational display in the UI.
 *
 * @param scheme - Modulation scheme
 * @returns Object with scheme characteristics
 */
export function getSchemeInfo(scheme: ModulationScheme): {
  name: string;
  fullName: string;
  bitsPerSymbol: number;
  constellationSize: number;
  description: string;
} {
  const info = {
    'BPSK': {
      name: 'BPSK',
      fullName: 'Binary Phase Shift Keying',
      bitsPerSymbol: 1,
      constellationSize: 2,
      description: 'Simplest digital modulation. Most robust to noise but lowest data rate.',
    },
    'QPSK': {
      name: 'QPSK',
      fullName: 'Quadrature Phase Shift Keying',
      bitsPerSymbol: 2,
      constellationSize: 4,
      description: 'Same BER as BPSK but double the data rate. Widely used in satellite and cellular.',
    },
    '8-PSK': {
      name: '8-PSK',
      fullName: '8-ary Phase Shift Keying',
      bitsPerSymbol: 3,
      constellationSize: 8,
      description: '50% more bits than QPSK but requires higher SNR. Used in satellite communications.',
    },
    '16-QAM': {
      name: '16-QAM',
      fullName: '16-ary Quadrature Amplitude Modulation',
      bitsPerSymbol: 4,
      constellationSize: 16,
      description: 'Uses amplitude and phase variation. Common in WiFi and LTE.',
    },
    '64-QAM': {
      name: '64-QAM',
      fullName: '64-ary Quadrature Amplitude Modulation',
      bitsPerSymbol: 6,
      constellationSize: 64,
      description: 'High spectral efficiency but requires high SNR. Used in cable modems and 5G.',
    },
  };

  return info[scheme];
}
