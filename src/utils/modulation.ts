/**
 * Digital Modulation Functions
 *
 * This module implements the core modulation and demodulation operations:
 * - Constellation generation with Gray coding
 * - Bit-to-symbol mapping (modulation)
 * - Symbol-to-bit mapping (demodulation via minimum distance detection)
 * - Bit error counting
 *
 * Key Concepts:
 * - Modulation: Converting bits into complex symbols for transmission
 * - Demodulation: Recovering bits from received (noisy) symbols
 * - Gray coding: Adjacent symbols differ by only 1 bit (minimizes bit errors)
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import type { Complex, ConstellationPoint, ModulationScheme } from '../types';
import { BITS_PER_SYMBOL } from '../types';
import { complexFromPolar, complexDistanceSquared } from './math';

// =============================================================================
// CONSTELLATION GENERATION
// =============================================================================

/**
 * Generates the constellation diagram for a given modulation scheme.
 *
 * Each constellation point includes:
 * - I, Q coordinates (normalized for unit average power where practical)
 * - Bit label using Gray coding
 *
 * Gray Coding Explanation:
 * Gray code ensures that adjacent constellation points differ by exactly
 * one bit. When noise causes a symbol error to an adjacent point,
 * only one bit is wrong instead of potentially multiple bits.
 *
 * Example (QPSK):
 *   Standard binary: 00, 01, 10, 11 (going around circle)
 *   Gray code:       00, 01, 11, 10 (adjacent points differ by 1 bit)
 *
 * @param scheme - The modulation scheme
 * @returns Array of constellation points with bit labels
 */
export function generateConstellation(scheme: ModulationScheme): ConstellationPoint[] {
  switch (scheme) {
    case 'BPSK':
      return generateBPSK();
    case 'QPSK':
      return generateQPSK();
    case '8-PSK':
      return generate8PSK();
    case '16-QAM':
      return generate16QAM();
    case '64-QAM':
      return generate64QAM();
    default:
      throw new Error(`Unknown modulation scheme: ${scheme}`);
  }
}

/**
 * Generates BPSK (Binary Phase Shift Keying) constellation.
 *
 * BPSK is the simplest digital modulation:
 * - 2 points on the real axis at ±1
 * - 1 bit per symbol
 * - Maximum noise immunity (points are furthest apart for given power)
 *
 * Constellation:
 *        Q
 *        │
 *   ●────┼────●
 *  "1"   │   "0"    ← I axis
 *  -1    0    +1
 *
 * Signal representation:
 *   Bit 0 → +1 (0° phase)
 *   Bit 1 → -1 (180° phase)
 */
function generateBPSK(): ConstellationPoint[] {
  return [
    { I: 1, Q: 0, bits: '0' },   // Right point (0°)
    { I: -1, Q: 0, bits: '1' },  // Left point (180°)
  ];
}

/**
 * Generates QPSK (Quadrature Phase Shift Keying) constellation.
 *
 * QPSK doubles the data rate of BPSK with the same BER per bit!
 * - 4 points at 45°, 135°, 225°, 315° on unit circle
 * - 2 bits per symbol
 * - Also known as 4-QAM or 4-PSK
 *
 * Constellation (Gray coded):
 *           Q
 *           │
 *     01 ●  │  ● 00
 *           │
 *     ──────┼──────  I
 *           │
 *     11 ●  │  ● 10
 *           │
 *
 * The points are at (±1, ±1)/√2 to normalize to unit power.
 *
 * Gray coding pattern (going counterclockwise from quadrant 1):
 *   Quadrant I:   00
 *   Quadrant II:  01
 *   Quadrant III: 11
 *   Quadrant IV:  10
 */
function generateQPSK(): ConstellationPoint[] {
  // Normalize so each point has unit magnitude: 1/√2 ≈ 0.707
  const scale = 1 / Math.sqrt(2);

  return [
    { I: scale, Q: scale, bits: '00' },     // Quadrant I (45°)
    { I: -scale, Q: scale, bits: '01' },    // Quadrant II (135°)
    { I: -scale, Q: -scale, bits: '11' },   // Quadrant III (225°)
    { I: scale, Q: -scale, bits: '10' },    // Quadrant IV (315°)
  ];
}

/**
 * Generates 8-PSK constellation.
 *
 * 8-PSK places 8 points equally spaced on the unit circle:
 * - 3 bits per symbol (8 = 2³)
 * - Points at 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
 * - Higher spectral efficiency than QPSK, but closer points = more errors
 *
 * Constellation (Gray coded):
 *              Q
 *              │
 *        011 ● │ ● 001
 *       ╱      │      ╲
 *     010●─────┼─────●000  ← I axis
 *       ╲      │      ╱
 *        110 ● │ ● 100
 *              │
 *             111 101
 *
 * Gray code pattern ensures adjacent points differ by 1 bit.
 * We use a standard Gray code mapping for 3-bit symbols.
 */
function generate8PSK(): ConstellationPoint[] {
  const points: ConstellationPoint[] = [];

  // Gray code sequence for 3 bits (0-7)
  // Standard Gray code: decimal → Gray
  // 0→000, 1→001, 2→011, 3→010, 4→110, 5→111, 6→101, 7→100
  const grayCode3 = ['000', '001', '011', '010', '110', '111', '101', '100'];

  for (let i = 0; i < 8; i++) {
    // Place points at angles: 0°, 45°, 90°, ..., 315°
    // Starting at 0° and going counterclockwise
    const angle = (i * Math.PI) / 4;  // i × 45° in radians
    const point = complexFromPolar(1, angle);

    points.push({
      I: point.I,
      Q: point.Q,
      bits: grayCode3[i],
    });
  }

  return points;
}

/**
 * Generates 16-QAM (Quadrature Amplitude Modulation) constellation.
 *
 * 16-QAM uses a 4×4 rectangular grid:
 * - 4 bits per symbol (16 = 2⁴)
 * - Varies both amplitude AND phase (unlike PSK which is phase-only)
 * - Common in WiFi (802.11), LTE, cable modems
 *
 * Constellation (Gray coded):
 *
 *       Q
 *       │  -3   -1    1    3   ← I values
 *    3  │  0010 0110 1110 1010
 *       │
 *    1  │  0011 0111 1111 1011
 *       │
 *   ────┼────────────────────  I
 *       │
 *   -1  │  0001 0101 1101 1001
 *       │
 *   -3  │  0000 0100 1100 1000
 *
 * The first 2 bits encode the I coordinate (Gray coded)
 * The last 2 bits encode the Q coordinate (Gray coded)
 *
 * Normalized so average symbol energy = 1
 */
function generate16QAM(): ConstellationPoint[] {
  const points: ConstellationPoint[] = [];

  // 2-bit Gray code for each axis: 0→00, 1→01, 2→11, 3→10
  const gray2 = ['00', '01', '11', '10'];

  // Coordinate values: -3, -1, +1, +3 (before normalization)
  const coords = [-3, -1, 1, 3];

  // Normalization factor for unit average energy
  // Average energy = (1/16) × sum of |point|² = (1/16) × 4 × (2×(1²+3²)+2×(1²+1²)+...)
  // For 16-QAM with coords ±1, ±3: avg = (1/16) × (4×2 + 8×10 + 4×18) = 10
  // So we scale by 1/√10
  const scale = 1 / Math.sqrt(10);

  for (let qi = 0; qi < 4; qi++) {      // Q coordinate index
    for (let ii = 0; ii < 4; ii++) {    // I coordinate index
      const I = coords[ii] * scale;
      const Q = coords[qi] * scale;

      // Bit mapping: first 2 bits for I, last 2 bits for Q
      const bits = gray2[ii] + gray2[qi];

      points.push({ I, Q, bits });
    }
  }

  return points;
}

/**
 * Generates 64-QAM constellation.
 *
 * 64-QAM uses an 8×8 rectangular grid:
 * - 6 bits per symbol (64 = 2⁶)
 * - Very high spectral efficiency
 * - Requires high SNR (small distances between points)
 * - Used in cable modems, high-rate WiFi, 4G/5G
 *
 * Structure:
 * - 8 amplitude levels per axis: -7, -5, -3, -1, +1, +3, +5, +7
 * - First 3 bits encode I (Gray coded)
 * - Last 3 bits encode Q (Gray coded)
 *
 * Normalized so average symbol energy ≈ 1
 */
function generate64QAM(): ConstellationPoint[] {
  const points: ConstellationPoint[] = [];

  // 3-bit Gray code for each axis
  const gray3 = ['000', '001', '011', '010', '110', '111', '101', '100'];

  // Coordinate values: -7, -5, -3, -1, +1, +3, +5, +7 (before normalization)
  const coords = [-7, -5, -3, -1, 1, 3, 5, 7];

  // Normalization factor for unit average energy
  // For 64-QAM: avg = 42, so scale by 1/√42
  const scale = 1 / Math.sqrt(42);

  for (let qi = 0; qi < 8; qi++) {      // Q coordinate index
    for (let ii = 0; ii < 8; ii++) {    // I coordinate index
      const I = coords[ii] * scale;
      const Q = coords[qi] * scale;

      // Bit mapping: first 3 bits for I, last 3 bits for Q
      const bits = gray3[ii] + gray3[qi];

      points.push({ I, Q, bits });
    }
  }

  return points;
}

// =============================================================================
// MODULATION (Bits → Symbols)
// =============================================================================

/**
 * Modulates a bit sequence into complex symbols.
 *
 * This is the transmitter's job:
 * 1. Group bits according to bits-per-symbol for the modulation scheme
 * 2. Look up each bit group in the constellation
 * 3. Output the corresponding I/Q symbol
 *
 * Example (QPSK):
 *   Input bits:  [0, 1, 1, 0, 0, 0, 1, 1]
 *   Grouped:     ["01", "10", "00", "11"]
 *   Output:      [(-0.707, 0.707), (0.707, -0.707), (0.707, 0.707), (-0.707, -0.707)]
 *
 * @param bits - Array of bits (0s and 1s) to modulate
 * @param constellation - The constellation points with bit labels
 * @returns Array of complex symbols
 */
export function modulateBits(bits: number[], constellation: ConstellationPoint[]): Complex[] {
  const bitsPerSymbol = constellation[0].bits.length;
  const symbols: Complex[] = [];

  // Create a lookup map from bit string to constellation point
  const bitMap = new Map<string, ConstellationPoint>();
  for (const point of constellation) {
    bitMap.set(point.bits, point);
  }

  // Process bits in groups of bitsPerSymbol
  for (let i = 0; i + bitsPerSymbol <= bits.length; i += bitsPerSymbol) {
    // Extract this group of bits as a string
    const bitGroup = bits.slice(i, i + bitsPerSymbol).join('');

    // Look up the corresponding constellation point
    const point = bitMap.get(bitGroup);
    if (!point) {
      throw new Error(`Invalid bit pattern: ${bitGroup}`);
    }

    symbols.push({ I: point.I, Q: point.Q });
  }

  return symbols;
}

/**
 * Converts a symbol back to its bit string using the constellation.
 *
 * This is a helper function that finds which constellation point
 * a symbol corresponds to and returns its bit label.
 *
 * @param symbol - Complex symbol (should be an ideal constellation point)
 * @param constellation - The constellation points
 * @returns Bit string for this symbol
 */
export function symbolToBits(symbol: Complex, constellation: ConstellationPoint[]): string {
  // Find the closest constellation point
  let minDist = Infinity;
  let closestPoint = constellation[0];

  for (const point of constellation) {
    const dist = complexDistanceSquared(symbol, point);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = point;
    }
  }

  return closestPoint.bits;
}

// =============================================================================
// DEMODULATION (Symbols → Bits)
// =============================================================================

/**
 * Demodulates received symbols back to bits using minimum distance detection.
 *
 * This is the receiver's job:
 * 1. For each received (noisy) symbol
 * 2. Find the closest constellation point (Euclidean distance)
 * 3. Output the bits associated with that point
 *
 * Why Minimum Distance?
 * - Under AWGN, minimum distance detection is optimal (maximum likelihood)
 * - It minimizes the probability of making a decision error
 * - Equivalent to finding the most likely transmitted symbol given the received signal
 *
 * Mathematical basis:
 *   For AWGN: P(y|x) ∝ exp(-|y-x|²/(2σ²))
 *   Maximizing this is equivalent to minimizing |y-x|²
 *
 * @param received - Array of received (noisy) complex symbols
 * @param constellation - The constellation points with bit labels
 * @returns Array of bit strings (one per symbol)
 */
export function demodulate(received: Complex[], constellation: ConstellationPoint[]): string[] {
  return received.map(symbol => {
    // Find the constellation point with minimum Euclidean distance
    let minDistSquared = Infinity;
    let decidedBits = constellation[0].bits;

    for (const point of constellation) {
      // Use squared distance (avoids sqrt, faster comparison)
      const distSquared = complexDistanceSquared(symbol, point);

      if (distSquared < minDistSquared) {
        minDistSquared = distSquared;
        decidedBits = point.bits;
      }
    }

    return decidedBits;
  });
}

/**
 * Demodulates a single received symbol with detailed information.
 *
 * Returns not just the decided bits, but also which constellation point
 * was chosen and whether it matches the transmitted symbol.
 *
 * Useful for:
 * - Constellation diagram visualization
 * - Detailed error analysis
 *
 * @param received - Single received (noisy) symbol
 * @param transmitted - The original transmitted symbol
 * @param constellation - The constellation points
 * @returns Object with transmitted bits, decoded bits, and error flag
 */
export function demodulateWithInfo(
  received: Complex,
  transmitted: Complex,
  constellation: ConstellationPoint[]
): { transmittedBits: string; decodedBits: string; isError: boolean } {
  // Find transmitted bits (what was actually sent)
  const transmittedBits = symbolToBits(transmitted, constellation);

  // Find decoded bits (what the receiver decides)
  const [decodedBits] = demodulate([received], constellation);

  // Check if any bit errors occurred
  const isError = transmittedBits !== decodedBits;

  return { transmittedBits, decodedBits, isError };
}

// =============================================================================
// BIT ERROR COUNTING
// =============================================================================

/**
 * Counts the number of bit errors between transmitted and received bit sequences.
 *
 * Uses XOR to find differing bits:
 *   transmitted: 0 1 1 0 1 0
 *   received:    0 1 0 0 1 1
 *   XOR:         0 0 1 0 0 1  → 2 bit errors
 *
 * This is the fundamental operation for computing Bit Error Rate (BER):
 *   BER = (number of bit errors) / (total bits transmitted)
 *
 * @param transmitted - Array of transmitted bits
 * @param received - Array of received bits
 * @returns Number of differing bits
 */
export function countBitErrors(transmitted: number[], received: number[]): number {
  if (transmitted.length !== received.length) {
    throw new Error('Bit arrays must have the same length');
  }

  let errors = 0;
  for (let i = 0; i < transmitted.length; i++) {
    // XOR: 0⊕0=0, 0⊕1=1, 1⊕0=1, 1⊕1=0
    if (transmitted[i] !== received[i]) {
      errors++;
    }
  }

  return errors;
}

/**
 * Counts bit errors between two bit strings.
 *
 * Convenience function for comparing symbol bit labels.
 *
 * @param transmitted - Transmitted bit string (e.g., "0110")
 * @param received - Received bit string (e.g., "0100")
 * @returns Number of differing bits
 */
export function countBitErrorsFromStrings(transmitted: string, received: string): number {
  if (transmitted.length !== received.length) {
    throw new Error('Bit strings must have the same length');
  }

  let errors = 0;
  for (let i = 0; i < transmitted.length; i++) {
    if (transmitted[i] !== received[i]) {
      errors++;
    }
  }

  return errors;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates random bits for simulation.
 *
 * In a real system, these would be the data bits to transmit.
 * For simulation, we generate uniformly random bits.
 *
 * @param count - Number of bits to generate
 * @returns Array of random bits (0s and 1s)
 */
export function generateRandomBits(count: number): number[] {
  const bits: number[] = [];
  for (let i = 0; i < count; i++) {
    bits.push(Math.random() < 0.5 ? 0 : 1);
  }
  return bits;
}

/**
 * Converts a bit array to a string representation.
 *
 * @param bits - Array of bits
 * @returns String like "01101001"
 */
export function bitsToString(bits: number[]): string {
  return bits.join('');
}

/**
 * Converts a bit string to an array of numbers.
 *
 * @param bitString - String like "01101001"
 * @returns Array of bits [0, 1, 1, 0, 1, 0, 0, 1]
 */
export function stringToBits(bitString: string): number[] {
  return bitString.split('').map(b => parseInt(b, 10));
}

/**
 * Gets the number of bits per symbol for a modulation scheme.
 *
 * @param scheme - The modulation scheme
 * @returns Number of bits per symbol (log₂ of constellation size)
 */
export function getBitsPerSymbol(scheme: ModulationScheme): number {
  return BITS_PER_SYMBOL[scheme];
}
