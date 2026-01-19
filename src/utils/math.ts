/**
 * Mathematical Utility Functions for Wireless Communications
 *
 * This module provides fundamental mathematical operations used throughout
 * the modulation simulator, including:
 * - The Q-function (tail probability of Gaussian distribution)
 * - dB conversions
 * - Complex number arithmetic
 * - Gaussian random number generation
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import type { Complex } from '../types';

// =============================================================================
// THE Q-FUNCTION
// =============================================================================

/**
 * Computes the Q-function Q(x) = P(Z > x) where Z ~ N(0,1).
 *
 * The Q-function is fundamental to digital communications because it gives
 * the probability that a standard Gaussian random variable exceeds a threshold.
 *
 * Mathematical definition:
 *   Q(x) = (1/√(2π)) ∫[x to ∞] exp(-t²/2) dt
 *
 * Relationship to other functions:
 *   Q(x) = 0.5 × erfc(x/√2)
 *   Q(x) = 1 - Φ(x)  where Φ is the standard normal CDF
 *
 * Why it matters for BER:
 * - In AWGN channels, errors occur when noise exceeds the decision threshold
 * - For BPSK: P(error) = Q(√(2Eb/N0))
 * - The Q-function appears in BER formulas for all modulation schemes
 *
 * This implementation uses a highly accurate polynomial approximation
 * (Abramowitz & Stegun approximation, accurate to ~10⁻⁷).
 *
 * @param x - The threshold value
 * @returns Q(x) - Probability that N(0,1) exceeds x
 */
export function qFunction(x: number): number {
  // Handle negative x using symmetry: Q(-x) = 1 - Q(x)
  if (x < 0) {
    return 1 - qFunction(-x);
  }

  // For very large x, Q(x) ≈ 0 (avoid numerical underflow)
  if (x > 8) {
    return 0;
  }

  // Abramowitz & Stegun approximation (Formula 26.2.17)
  // This is a rational polynomial approximation
  const t = 1 / (1 + 0.2316419 * x);

  // Coefficients for the approximation
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  // Standard normal PDF at x: (1/√(2π)) × exp(-x²/2)
  const pdf = 0.3989422804014327 * Math.exp(-0.5 * x * x);

  // Compute Q(x) using Horner's method for the polynomial
  const polynomial = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));

  return pdf * polynomial;
}

/**
 * Computes the inverse Q-function Q⁻¹(p).
 *
 * Given a probability p, find x such that Q(x) = p.
 *
 * Useful for:
 * - Determining required SNR for a target BER
 * - Link budget calculations
 *
 * Uses Newton-Raphson iteration for numerical solution.
 *
 * @param p - Target probability (0 < p < 1)
 * @returns x such that Q(x) = p
 */
export function qFunctionInverse(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive)');
  }

  // Handle p > 0.5 using symmetry
  if (p > 0.5) {
    return -qFunctionInverse(1 - p);
  }

  // Initial guess using approximation
  let x = Math.sqrt(-2 * Math.log(p));

  // Newton-Raphson iteration
  for (let i = 0; i < 10; i++) {
    const fx = qFunction(x) - p;
    // Derivative of Q(x) is -φ(x) where φ is the standard normal PDF
    const fpx = -0.3989422804014327 * Math.exp(-0.5 * x * x);
    x = x - fx / fpx;
  }

  return x;
}

// =============================================================================
// DECIBEL CONVERSIONS
// =============================================================================

/**
 * Convert a linear power ratio to decibels.
 *
 * dB = 10 × log₁₀(linear)
 *
 * Why we use dB in communications:
 * - Multiplicative gains become additive (easier link budgets)
 * - Spans many orders of magnitude (signal powers vary by 10¹² or more)
 * - Industry standard for specifying SNR, gain, loss
 *
 * @param linear - Linear power ratio (must be positive)
 * @returns Value in decibels
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) {
    return -Infinity;
  }
  return 10 * Math.log10(linear);
}

/**
 * Convert decibels to a linear power ratio.
 *
 * linear = 10^(dB/10)
 *
 * @param db - Value in decibels
 * @returns Linear power ratio
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 10);
}

// =============================================================================
// COMPLEX NUMBER ARITHMETIC
// =============================================================================

/**
 * Creates a complex number from I and Q components.
 *
 * @param I - In-phase (real) component
 * @param Q - Quadrature (imaginary) component
 * @returns Complex number {I, Q}
 */
export function complex(I: number, Q: number): Complex {
  return { I, Q };
}

/**
 * Computes the magnitude (absolute value) of a complex number.
 *
 * |z| = √(I² + Q²)
 *
 * In signal terms, this is the instantaneous amplitude/envelope.
 *
 * @param z - Complex number
 * @returns Magnitude |z|
 */
export function complexMagnitude(z: Complex): number {
  return Math.sqrt(z.I * z.I + z.Q * z.Q);
}

/**
 * Computes the squared magnitude of a complex number.
 *
 * |z|² = I² + Q²
 *
 * Often used for power calculations (avoids the square root).
 * Power ∝ |signal|²
 *
 * @param z - Complex number
 * @returns Squared magnitude |z|²
 */
export function complexMagnitudeSquared(z: Complex): number {
  return z.I * z.I + z.Q * z.Q;
}

/**
 * Computes the phase angle of a complex number.
 *
 * θ = atan2(Q, I)
 *
 * Returns angle in radians, range (-π, π].
 * In signal terms, this is the instantaneous phase.
 *
 * @param z - Complex number
 * @returns Phase angle in radians
 */
export function complexPhase(z: Complex): number {
  return Math.atan2(z.Q, z.I);
}

/**
 * Creates a complex number from polar coordinates.
 *
 * z = r × exp(jθ) = r×cos(θ) + j×r×sin(θ)
 *
 * Useful for generating PSK constellation points on the unit circle.
 *
 * @param r - Magnitude (radius)
 * @param theta - Phase angle in radians
 * @returns Complex number {I, Q}
 */
export function complexFromPolar(r: number, theta: number): Complex {
  return {
    I: r * Math.cos(theta),
    Q: r * Math.sin(theta),
  };
}

/**
 * Adds two complex numbers.
 *
 * (a + jb) + (c + jd) = (a+c) + j(b+d)
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Sum a + b
 */
export function complexAdd(a: Complex, b: Complex): Complex {
  return {
    I: a.I + b.I,
    Q: a.Q + b.Q,
  };
}

/**
 * Subtracts two complex numbers.
 *
 * (a + jb) - (c + jd) = (a-c) + j(b-d)
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Difference a - b
 */
export function complexSubtract(a: Complex, b: Complex): Complex {
  return {
    I: a.I - b.I,
    Q: a.Q - b.Q,
  };
}

/**
 * Multiplies two complex numbers.
 *
 * (a + jb)(c + jd) = (ac - bd) + j(ad + bc)
 *
 * Complex multiplication is used for:
 * - Frequency/phase shifts: multiply by exp(jθ)
 * - Matched filtering
 * - Channel equalization
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Product a × b
 */
export function complexMultiply(a: Complex, b: Complex): Complex {
  return {
    I: a.I * b.I - a.Q * b.Q,
    Q: a.I * b.Q + a.Q * b.I,
  };
}

/**
 * Scales a complex number by a real scalar.
 *
 * k × (a + jb) = ka + jkb
 *
 * @param z - Complex number
 * @param k - Real scalar
 * @returns Scaled complex number k × z
 */
export function complexScale(z: Complex, k: number): Complex {
  return {
    I: k * z.I,
    Q: k * z.Q,
  };
}

/**
 * Computes the complex conjugate.
 *
 * (a + jb)* = a - jb
 *
 * Used in matched filtering and correlation operations.
 *
 * @param z - Complex number
 * @returns Complex conjugate z*
 */
export function complexConjugate(z: Complex): Complex {
  return {
    I: z.I,
    Q: -z.Q,
  };
}

/**
 * Computes the Euclidean distance between two complex numbers.
 *
 * d(a, b) = |a - b| = √((aI-bI)² + (aQ-bQ)²)
 *
 * This is the fundamental metric for symbol detection:
 * - The receiver chooses the constellation point closest to the received signal
 * - This is called "minimum distance" or "maximum likelihood" detection
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Euclidean distance
 */
export function complexDistance(a: Complex, b: Complex): number {
  const dI = a.I - b.I;
  const dQ = a.Q - b.Q;
  return Math.sqrt(dI * dI + dQ * dQ);
}

/**
 * Computes the squared Euclidean distance between two complex numbers.
 *
 * d²(a, b) = |a - b|² = (aI-bI)² + (aQ-bQ)²
 *
 * For minimum distance detection, we only need to compare distances,
 * so we can skip the square root (optimization).
 *
 * @param a - First complex number
 * @param b - Second complex number
 * @returns Squared Euclidean distance
 */
export function complexDistanceSquared(a: Complex, b: Complex): number {
  const dI = a.I - b.I;
  const dQ = a.Q - b.Q;
  return dI * dI + dQ * dQ;
}

// =============================================================================
// RANDOM NUMBER GENERATION
// =============================================================================

/**
 * Generates a Gaussian (normal) random variable using Box-Muller transform.
 *
 * The Box-Muller method transforms two independent uniform random variables
 * U₁, U₂ ~ Uniform(0,1) into two independent standard normal variables:
 *
 *   Z₁ = √(-2 ln U₁) × cos(2π U₂)
 *   Z₂ = √(-2 ln U₁) × sin(2π U₂)
 *
 * Why Gaussian noise?
 * - Thermal noise in electronic systems is Gaussian (Central Limit Theorem)
 * - Aggregate of many small random effects → Gaussian distribution
 * - AWGN (Additive White Gaussian Noise) is the standard channel model
 *
 * @param mean - Mean of the distribution (default 0)
 * @param stdDev - Standard deviation (default 1)
 * @returns A sample from N(mean, stdDev²)
 */
export function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
  // Box-Muller transform
  // We generate two uniform random numbers and transform them
  const u1 = Math.random();
  const u2 = Math.random();

  // Avoid log(0) by ensuring u1 > 0
  const safeU1 = Math.max(u1, 1e-10);

  // Box-Muller formula (we only use one of the two generated values)
  const z = Math.sqrt(-2 * Math.log(safeU1)) * Math.cos(2 * Math.PI * u2);

  // Scale and shift to desired mean and variance
  return mean + stdDev * z;
}

/**
 * Generates a pair of independent Gaussian random variables.
 *
 * More efficient than calling gaussianRandom() twice since Box-Muller
 * naturally produces two values.
 *
 * @param mean - Mean of the distribution (default 0)
 * @param stdDev - Standard deviation (default 1)
 * @returns Tuple of two independent N(mean, stdDev²) samples
 */
export function gaussianRandomPair(mean: number = 0, stdDev: number = 1): [number, number] {
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();

  const magnitude = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;

  const z1 = magnitude * Math.cos(angle);
  const z2 = magnitude * Math.sin(angle);

  return [mean + stdDev * z1, mean + stdDev * z2];
}

/**
 * Generates a complex Gaussian random variable.
 *
 * A circularly-symmetric complex Gaussian (CSCG) has:
 * - Independent Gaussian real and imaginary parts
 * - Each part has variance σ²/2 so total power is σ²
 *
 * This is the standard model for complex baseband noise.
 *
 * @param variance - Total variance (power) of the complex noise
 * @returns Complex Gaussian sample
 */
export function complexGaussianRandom(variance: number = 1): Complex {
  // Each component gets half the total variance
  const stdDev = Math.sqrt(variance / 2);
  const [I, Q] = gaussianRandomPair(0, stdDev);
  return { I, Q };
}
