/**
 * Wireless Modulation Simulator - Main Application
 *
 * An interactive educational web application for graduate students studying
 * wireless communications. This simulator allows students to explore digital
 * modulation schemes, visualize time-domain waveforms and constellation
 * diagrams, and compare simulated BER performance against theoretical results.
 *
 * Features:
 * - Real-time modulation/demodulation simulation
 * - Support for BPSK, QPSK, 8-PSK, 16-QAM, and 64-QAM
 * - Interactive SNR (Eb/N0) control
 * - Time-domain waveform visualization (I/Q components)
 * - Constellation diagram with noise scatter
 * - BER performance curves (theoretical vs simulated)
 * - Running statistics with confidence indicators
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import './index.css';
import { useMemo } from 'react';

// Import custom hooks
import { useSimulation } from './hooks/useSimulation';

// Import UI components
import ModulationSelector from './components/ModulationSelector';
import SNRSlider from './components/SNRSlider';
import PlaybackControls from './components/PlaybackControls';
import StatisticsPanel from './components/StatisticsPanel';
import ConstellationDiagram from './components/ConstellationDiagram';
import WaveformDisplay from './components/WaveformDisplay';
import BERPlot from './components/BERPlot';
import ModulationWaveforms from './components/ModulationWaveforms';

// Import types and utilities
import { BITS_PER_SYMBOL } from './types';
import { getMaxUsefulSnr } from './utils/theory';

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

/**
 * App Component
 *
 * The main application component that assembles all simulation visualizations
 * and controls into a cohesive educational interface.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  HEADER - Title and course info                                     │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  CONTROLS - Modulation selector, SNR slider, playback controls      │
 * ├─────────────────────────────┬───────────────────────────────────────┤
 * │  CONSTELLATION DIAGRAM      │  BER PERFORMANCE PLOT                 │
 * ├─────────────────────────────┴───────────────────────────────────────┤
 * │  STATISTICS PANEL - Running counts, BER comparison                  │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  WAVEFORMS - Transmitted and received I/Q signals                   │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  MODULATION WAVEFORM REFERENCE - Passband waveforms & spectrum      │
 * └─────────────────────────────────────────────────────────────────────┘
 */
function App() {
  // Initialize the simulation hook with default settings
  const {
    state,
    constellation,
    transmittedWaveform,
    receivedWaveform,
    currentBER,
    theoreticalBER,
    play,
    pause,
    step,
    reset,
    setScheme,
    setSnrDb,
    setPlaybackSpeed,
  } = useSimulation('QPSK', 10);

  // Calculate the maximum useful SNR based on current scheme
  // This is where BER becomes negligible (~10^-6)
  const maxSnr = useMemo(() => getMaxUsefulSnr(state.scheme), [state.scheme]);

  // Clamp current SNR if it exceeds the new max when scheme changes
  if (state.snrDb > maxSnr) {
    setSnrDb(maxSnr);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      {/* Main container with max width for large screens */}
      <div className="max-w-7xl mx-auto space-y-4">

        {/* ============================================================= */}
        {/* HEADER SECTION */}
        {/* ============================================================= */}
        <header className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">
                Wireless Modulation Simulator
              </h1>
              <p className="text-sm text-slate-400">
                Interactive Digital Communications Educational Tool
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>EE597 - Wireless Networks</div>
              <div>University of Southern California</div>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* CONTROL PANEL */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Modulation Scheme Selector */}
          <ModulationSelector
            selected={state.scheme}
            onChange={setScheme}
          />

          {/* SNR (Eb/N0) Slider - max dynamically set based on scheme */}
          <SNRSlider
            value={state.snrDb}
            onChange={setSnrDb}
            min={-5}
            max={maxSnr}
            step={0.5}
          />

          {/* Playback Controls */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-3 font-medium">
              SIMULATION CONTROLS
            </div>
            <PlaybackControls
              isPlaying={state.isPlaying}
              speed={state.playbackSpeed}
              onPlay={play}
              onPause={pause}
              onStep={step}
              onReset={reset}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>
        </div>

        {/* ============================================================= */}
        {/* CONSTELLATION AND BER PLOTS (Side by Side) */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Constellation Diagram */}
          <ConstellationDiagram
            constellation={constellation}
            receivedSymbols={state.recentSymbols}
            scheme={state.scheme}
            width={400}
            height={400}
            showLabels={true}
            showUnitCircle={true}
            showGrid={true}
          />

          {/* BER Performance Plot - X-axis matches SNR slider range */}
          <BERPlot
            scheme={state.scheme}
            currentSnrDb={state.snrDb}
            simulatedBER={state.bitCount > 0 ? currentBER : null}
            bitCount={state.bitCount}
            snrMin={0}
            snrMax={maxSnr}
          />
        </div>

        {/* ============================================================= */}
        {/* STATISTICS PANEL */}
        {/* ============================================================= */}
        <StatisticsPanel
          scheme={state.scheme}
          snrDb={state.snrDb}
          symbolCount={state.symbolCount}
          bitCount={state.bitCount}
          errorCount={state.bitErrorCount}
          simulatedBER={currentBER}
          theoreticalBER={theoreticalBER}
          isPlaying={state.isPlaying}
        />

        {/* ============================================================= */}
        {/* WAVEFORM DISPLAY */}
        {/* ============================================================= */}
        <WaveformDisplay
          transmittedWaveform={transmittedWaveform}
          receivedWaveform={receivedWaveform}
          bits={state.currentBits}
          bitsPerSymbol={BITS_PER_SYMBOL[state.scheme]}
        />

        {/* ============================================================= */}
        {/* MODULATION WAVEFORM REFERENCE (Static Illustration) */}
        {/* ============================================================= */}
        <ModulationWaveforms
          scheme={state.scheme}
          carrierCycles={4}
        />

        {/* ============================================================= */}
        {/* FOOTER - Educational Information */}
        {/* ============================================================= */}
        <footer className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-xs text-slate-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Reference */}
            <div>
              <h3 className="text-slate-400 font-medium mb-2">Quick Reference</h3>
              <ul className="space-y-1">
                <li><strong className="text-cyan-400">I(t)</strong> = In-phase (cosine carrier)</li>
                <li><strong className="text-orange-400">Q(t)</strong> = Quadrature (sine carrier)</li>
                <li><strong>Eb/N0</strong> = Energy per bit / Noise density</li>
                <li><strong>BER</strong> = Bit Error Rate</li>
              </ul>
            </div>

            {/* Key Concepts */}
            <div>
              <h3 className="text-slate-400 font-medium mb-2">Key Concepts</h3>
              <ul className="space-y-1">
                <li>Higher order modulation = more bits/symbol</li>
                <li>But also = closer points = more errors</li>
                <li>QPSK has same BER as BPSK (per bit)</li>
                <li>Gray coding minimizes bit errors</li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h3 className="text-slate-400 font-medium mb-2">About</h3>
              <p>
                This simulator demonstrates digital modulation over AWGN channels.
                Observe how noise affects the received constellation and how
                simulated BER converges to theoretical values.
              </p>
              <p className="mt-2 text-slate-600">
                Developed by Bhaskar Krishnamachari with Claude Code, January 2026
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
