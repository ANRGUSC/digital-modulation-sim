/**
 * Simulation Hook - Core Logic for the Modulation Simulator
 *
 * This hook manages the entire simulation state and provides controls
 * for running the modulation/demodulation demonstration.
 *
 * Simulation Flow:
 * ================
 * 1. Generate random bits to transmit
 * 2. Modulate bits into complex symbols (mapping to constellation)
 * 3. Add AWGN noise (simulating channel effects)
 * 4. Demodulate received symbols (minimum distance detection)
 * 5. Count bit errors
 * 6. Update statistics and visualizations
 *
 * The simulation runs continuously when "playing" and can be stepped
 * one symbol at a time for detailed analysis.
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  ConstellationPoint,
  ModulationScheme,
  ReceivedSymbol,
  SimulationState,
  WaveformData,
} from '../types';
import { BITS_PER_SYMBOL } from '../types';
import {
  generateConstellation,
  modulateBits,
  demodulate,
  generateRandomBits,
  countBitErrorsFromStrings,
  symbolToBits,
} from '../utils/modulation';
import { addAWGN, calculateNoiseStdDev } from '../utils/channel';
import { generateWaveform, addNoiseToWaveformData } from '../utils/waveform';
import { theoreticalBER } from '../utils/theory';
import { useAnimationFrame } from './useAnimationFrame';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Number of symbols to display in waveform plot.
 * More symbols = longer time series but more computation.
 */
const WAVEFORM_SYMBOLS = 8;

/**
 * Maximum recent symbols to keep for constellation display.
 * Too many points make the plot cluttered; too few don't show the noise distribution.
 */
const MAX_RECENT_SYMBOLS = 200;

/**
 * Samples per symbol for waveform generation.
 */
const SAMPLES_PER_SYMBOL = 20;

// =============================================================================
// HOOK INTERFACE
// =============================================================================

/**
 * Return type for the useSimulation hook.
 */
export interface UseSimulationReturn {
  // Current simulation state
  state: SimulationState;

  // Constellation data
  constellation: ConstellationPoint[];

  // Waveform data for display
  transmittedWaveform: WaveformData;
  receivedWaveform: WaveformData;

  // Computed statistics
  currentBER: number;
  theoreticalBER: number;

  // Control functions
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  setScheme: (scheme: ModulationScheme) => void;
  setSnrDb: (snr: number) => void;
  setPlaybackSpeed: (speed: number) => void;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main simulation hook that manages the modulation demonstration.
 *
 * Handles:
 * - Symbol generation and transmission
 * - AWGN channel simulation
 * - Error counting and BER calculation
 * - Waveform generation for display
 * - Animation loop for continuous playback
 *
 * @param initialScheme - Starting modulation scheme (default: QPSK)
 * @param initialSnrDb - Starting Eb/N0 in dB (default: 10)
 * @returns Simulation state and control functions
 */
export function useSimulation(
  initialScheme: ModulationScheme = 'QPSK',
  initialSnrDb: number = 10
): UseSimulationReturn {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /**
   * Core simulation state including:
   * - Current modulation scheme
   * - SNR setting
   * - Running error statistics
   * - Recent symbols for constellation display
   */
  const [state, setState] = useState<SimulationState>(() => ({
    scheme: initialScheme,
    snrDb: initialSnrDb,
    symbolCount: 0,
    bitCount: 0,
    bitErrorCount: 0,
    recentSymbols: [],
    currentSymbols: [],
    currentBits: [],
    noisySymbols: [],
    isPlaying: false,
    playbackSpeed: 100, // symbols per second
  }));

  /**
   * Time accumulator for controlling symbol generation rate.
   * Accumulates deltaTime until enough time has passed to generate
   * the next batch of symbols based on playbackSpeed.
   */
  const timeAccumulatorRef = useRef(0);

  // -------------------------------------------------------------------------
  // DERIVED VALUES
  // -------------------------------------------------------------------------

  /**
   * Generate constellation points for current modulation scheme.
   * Memoized to avoid regenerating on every render.
   */
  const constellation = useMemo(
    () => generateConstellation(state.scheme),
    [state.scheme]
  );

  /**
   * Calculate current simulated BER.
   * Returns 0 if no bits transmitted yet (avoid division by zero).
   */
  const currentBER = state.bitCount > 0
    ? state.bitErrorCount / state.bitCount
    : 0;

  /**
   * Get theoretical BER for comparison.
   */
  const theoreticalBERValue = theoreticalBER(state.scheme, state.snrDb);

  // -------------------------------------------------------------------------
  // WAVEFORM GENERATION
  // -------------------------------------------------------------------------

  /**
   * Generate transmitted waveform from current symbols.
   * Memoized for performance.
   */
  const transmittedWaveform = useMemo(() => {
    if (state.currentSymbols.length === 0) {
      // Return empty waveform if no symbols
      return { t: [], I: [], Q: [] };
    }
    return generateWaveform(state.currentSymbols, SAMPLES_PER_SYMBOL);
  }, [state.currentSymbols]);

  /**
   * Generate received (noisy) waveform.
   * Uses the noise standard deviation calculated from SNR.
   */
  const receivedWaveform = useMemo(() => {
    if (transmittedWaveform.t.length === 0) {
      return { t: [], I: [], Q: [] };
    }
    const noiseStdDev = calculateNoiseStdDev(state.snrDb, state.scheme);
    return addNoiseToWaveformData(transmittedWaveform, noiseStdDev);
  }, [transmittedWaveform, state.snrDb, state.scheme]);

  // -------------------------------------------------------------------------
  // SIMULATION STEP
  // -------------------------------------------------------------------------

  /**
   * Performs one step of the simulation:
   * 1. Generate random bits
   * 2. Modulate to symbols
   * 3. Add channel noise
   * 4. Demodulate and count errors
   * 5. Update statistics
   *
   * @param numSymbols - Number of symbols to process in this step
   */
  const simulateStep = useCallback((numSymbols: number = WAVEFORM_SYMBOLS) => {
    setState(prevState => {
      const currentConstellation = generateConstellation(prevState.scheme);
      const currentBitsPerSymbol = BITS_PER_SYMBOL[prevState.scheme];

      // Step 1: Generate random bits
      // We need enough bits for the desired number of symbols
      const numBits = numSymbols * currentBitsPerSymbol;
      const bits = generateRandomBits(numBits);

      // Step 2: Modulate bits into symbols
      // This maps bit groups to constellation points
      const txSymbols = modulateBits(bits, currentConstellation);

      // Step 3: Add AWGN channel noise
      // The noise variance depends on Eb/N0 (SNR)
      const rxSymbols = addAWGN(txSymbols, prevState.snrDb, prevState.scheme);

      // Step 4: Demodulate received symbols
      // Find closest constellation point for each received symbol
      const decodedBitStrings = demodulate(rxSymbols, currentConstellation);

      // Step 5: Count bit errors
      // Compare transmitted bits with decoded bits
      let stepErrors = 0;
      const newRecentSymbols: ReceivedSymbol[] = [];

      for (let i = 0; i < txSymbols.length; i++) {
        // Get the original bit string for this symbol
        const txBitString = symbolToBits(txSymbols[i], currentConstellation);
        const rxBitString = decodedBitStrings[i];

        // Count errors in this symbol
        const symbolErrors = countBitErrorsFromStrings(txBitString, rxBitString);
        stepErrors += symbolErrors;

        // Create received symbol record for constellation display
        newRecentSymbols.push({
          I: rxSymbols[i].I,
          Q: rxSymbols[i].Q,
          transmittedBits: txBitString,
          decodedBits: rxBitString,
          isError: symbolErrors > 0,
        });
      }

      // Step 6: Update state with new statistics
      // Keep only the most recent symbols for constellation display
      const updatedRecentSymbols = [
        ...prevState.recentSymbols,
        ...newRecentSymbols,
      ].slice(-MAX_RECENT_SYMBOLS);

      return {
        ...prevState,
        symbolCount: prevState.symbolCount + txSymbols.length,
        bitCount: prevState.bitCount + numBits,
        bitErrorCount: prevState.bitErrorCount + stepErrors,
        recentSymbols: updatedRecentSymbols,
        currentSymbols: txSymbols,
        currentBits: bits,
        noisySymbols: rxSymbols,
      };
    });
  }, []);

  // -------------------------------------------------------------------------
  // ANIMATION LOOP
  // -------------------------------------------------------------------------

  /**
   * Animation callback for continuous playback.
   * Accumulates time and triggers simulation steps at the configured rate.
   */
  const animationCallback = useCallback((deltaTime: number) => {
    // Accumulate time (in milliseconds)
    timeAccumulatorRef.current += deltaTime;

    // Calculate time between symbol batches based on playback speed
    // playbackSpeed is in symbols/second
    // We generate WAVEFORM_SYMBOLS at a time
    const msPerBatch = (WAVEFORM_SYMBOLS / state.playbackSpeed) * 1000;

    // Generate symbols when enough time has accumulated
    if (timeAccumulatorRef.current >= msPerBatch) {
      simulateStep(WAVEFORM_SYMBOLS);
      timeAccumulatorRef.current -= msPerBatch;
    }
  }, [state.playbackSpeed, simulateStep]);

  // Run animation loop when playing
  useAnimationFrame(animationCallback, state.isPlaying);

  // -------------------------------------------------------------------------
  // CONTROL FUNCTIONS
  // -------------------------------------------------------------------------

  /**
   * Start continuous simulation playback.
   */
  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
    timeAccumulatorRef.current = 0;
  }, []);

  /**
   * Pause simulation playback.
   */
  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  /**
   * Advance simulation by one symbol batch.
   * Useful for step-by-step analysis.
   */
  const step = useCallback(() => {
    simulateStep(WAVEFORM_SYMBOLS);
  }, [simulateStep]);

  /**
   * Reset all statistics and clear accumulated data.
   * Keeps current modulation scheme and SNR settings.
   */
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      symbolCount: 0,
      bitCount: 0,
      bitErrorCount: 0,
      recentSymbols: [],
      currentSymbols: [],
      currentBits: [],
      noisySymbols: [],
      isPlaying: false,
    }));
    timeAccumulatorRef.current = 0;
  }, []);

  /**
   * Change the modulation scheme.
   * Resets statistics since different schemes aren't directly comparable.
   */
  const setScheme = useCallback((scheme: ModulationScheme) => {
    setState(prev => ({
      ...prev,
      scheme,
      // Reset statistics for new scheme
      symbolCount: 0,
      bitCount: 0,
      bitErrorCount: 0,
      recentSymbols: [],
      currentSymbols: [],
      currentBits: [],
      noisySymbols: [],
    }));
  }, []);

  /**
   * Change the SNR (Eb/N0) setting.
   * Does not reset statistics - allows observing effect of changing SNR.
   */
  const setSnrDb = useCallback((snrDb: number) => {
    setState(prev => ({ ...prev, snrDb }));
  }, []);

  /**
   * Change the playback speed (symbols per second).
   */
  const setPlaybackSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  // -------------------------------------------------------------------------
  // RETURN VALUE
  // -------------------------------------------------------------------------

  return {
    state,
    constellation,
    transmittedWaveform,
    receivedWaveform,
    currentBER,
    theoreticalBER: theoreticalBERValue,
    play,
    pause,
    step,
    reset,
    setScheme,
    setSnrDb,
    setPlaybackSpeed,
  };
}
