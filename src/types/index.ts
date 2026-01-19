/**
 * Type Definitions for Wireless Modulation Simulator
 *
 * This file defines the core data structures used throughout the simulator.
 * Understanding these types is fundamental to understanding how digital
 * modulation systems work.
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

// =============================================================================
// COMPLEX NUMBER REPRESENTATION
// =============================================================================

/**
 * Complex number representation for baseband signals.
 *
 * In digital communications, we represent signals using complex (I/Q) notation:
 * - I (In-phase): The real component, represents the cosine carrier
 * - Q (Quadrature): The imaginary component, represents the sine carrier
 *
 * The transmitted signal can be written as:
 *   s(t) = I(t)·cos(2πfc·t) - Q(t)·sin(2πfc·t)
 *
 * where fc is the carrier frequency. This is called "quadrature modulation"
 * because cos and sin are 90° (a quarter cycle) apart.
 */
export interface Complex {
  I: number;  // In-phase component (real part)
  Q: number;  // Quadrature component (imaginary part)
}

// =============================================================================
// CONSTELLATION DIAGRAM TYPES
// =============================================================================

/**
 * A point in the constellation diagram with its bit mapping.
 *
 * Constellation diagrams are the "alphabet" of digital modulation:
 * - Each point represents a unique symbol that can be transmitted
 * - The position (I, Q) determines the amplitude and phase of the signal
 * - The 'bits' field shows which bit pattern maps to this symbol
 *
 * Example for QPSK (4 points):
 *   Point at (1, 1) might represent bits "00"
 *   Point at (-1, 1) might represent bits "01"
 *   etc.
 *
 * We use Gray coding: adjacent points differ by only 1 bit.
 * This minimizes bit errors when noise causes a symbol error to an adjacent point.
 */
export interface ConstellationPoint extends Complex {
  bits: string;  // Bit pattern, e.g., "0110" for 16-QAM
}

/**
 * A received symbol after passing through the channel.
 *
 * The received symbol includes:
 * - The noisy I/Q values (displaced from ideal due to AWGN)
 * - Reference to which symbol was actually transmitted (for error counting)
 * - The decoded bits (what the receiver decided was sent)
 */
export interface ReceivedSymbol extends Complex {
  transmittedBits: string;  // What was actually sent
  decodedBits: string;      // What the receiver decided
  isError: boolean;         // True if any bit errors occurred
}

// =============================================================================
// MODULATION SCHEME TYPES
// =============================================================================

/**
 * Supported digital modulation schemes.
 *
 * BPSK (Binary PSK):
 *   - 1 bit per symbol, 2 constellation points
 *   - Points at ±1 on real axis
 *   - Most robust to noise, but lowest data rate
 *
 * QPSK (Quadrature PSK):
 *   - 2 bits per symbol, 4 constellation points
 *   - Same BER performance as BPSK (per bit) but double the data rate!
 *   - Points at (±1, ±1)/√2 on unit circle
 *
 * 8-PSK:
 *   - 3 bits per symbol, 8 constellation points
 *   - Points equally spaced on unit circle (45° apart)
 *   - Higher data rate but more susceptible to noise
 *
 * 16-QAM (Quadrature Amplitude Modulation):
 *   - 4 bits per symbol, 16 constellation points
 *   - 4×4 grid pattern, varies both amplitude and phase
 *   - Common in WiFi, LTE
 *
 * 64-QAM:
 *   - 6 bits per symbol, 64 constellation points
 *   - 8×8 grid pattern
 *   - High data rate but requires good SNR
 *   - Used in cable modems, high-rate WiFi
 */
export type ModulationScheme = 'BPSK' | 'QPSK' | '8-PSK' | '16-QAM' | '64-QAM';

/**
 * Lookup table for bits per symbol for each modulation scheme.
 * This is simply log₂(M) where M is the constellation size.
 */
export const BITS_PER_SYMBOL: Record<ModulationScheme, number> = {
  'BPSK': 1,     // 2^1 = 2 points
  'QPSK': 2,     // 2^2 = 4 points
  '8-PSK': 3,    // 2^3 = 8 points
  '16-QAM': 4,   // 2^4 = 16 points
  '64-QAM': 6,   // 2^6 = 64 points
};

// =============================================================================
// SIMULATION STATE
// =============================================================================

/**
 * Complete state of the running simulation.
 *
 * This tracks everything needed to:
 * 1. Generate and display waveforms
 * 2. Accumulate BER statistics
 * 3. Update the constellation diagram
 */
export interface SimulationState {
  // Current configuration
  scheme: ModulationScheme;
  snrDb: number;              // Signal-to-noise ratio in dB (Eb/N0)

  // Running statistics for BER calculation
  symbolCount: number;        // Total symbols transmitted
  bitCount: number;           // Total bits transmitted
  bitErrorCount: number;      // Total bit errors detected

  // For constellation display - keep last N received symbols
  recentSymbols: ReceivedSymbol[];

  // For waveform display - current batch of symbols
  currentSymbols: Complex[];      // Transmitted symbols (ideal)
  currentBits: number[];          // Bits being transmitted
  noisySymbols: Complex[];        // Received symbols (with noise)

  // Playback state
  isPlaying: boolean;
  playbackSpeed: number;          // Symbols per second
}

// =============================================================================
// WAVEFORM DATA
// =============================================================================

/**
 * Time-domain waveform data for display.
 *
 * In baseband representation, we show:
 * - t: Time axis (in symbol periods)
 * - I: In-phase component samples
 * - Q: Quadrature component samples
 *
 * The number of samples = numSymbols × samplesPerSymbol
 *
 * Note: We use baseband (complex envelope) representation, not passband.
 * The actual transmitted RF signal would be:
 *   s(t) = Re{(I(t) + jQ(t)) · exp(j2πfc·t)}
 */
export interface WaveformData {
  t: number[];    // Time values (normalized to symbol period)
  I: number[];    // In-phase samples
  Q: number[];    // Quadrature samples
}

// =============================================================================
// BER SIMULATION DATA
// =============================================================================

/**
 * A single data point for the BER curve.
 *
 * For each SNR value, we track:
 * - The theoretical BER (from closed-form equations)
 * - The simulated BER (from Monte Carlo simulation)
 * - Confidence information based on number of samples
 */
export interface BERDataPoint {
  snrDb: number;
  theoreticalBER: number;
  simulatedBER: number | null;  // null if not enough data yet
  bitCount: number;             // How many bits simulated at this SNR
  errorCount: number;           // How many errors observed
}

/**
 * Configuration for the BER simulation range.
 */
export interface BERSimulationConfig {
  snrMin: number;       // Minimum Eb/N0 in dB
  snrMax: number;       // Maximum Eb/N0 in dB
  snrStep: number;      // Step size in dB
  bitsPerPoint: number; // Target bits to simulate per SNR point
}

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

/**
 * Props for components that need simulation controls.
 */
export interface SimulationControls {
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  setScheme: (scheme: ModulationScheme) => void;
  setSnrDb: (snr: number) => void;
  setPlaybackSpeed: (speed: number) => void;
}
