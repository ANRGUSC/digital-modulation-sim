/**
 * Digital Modulation Simulator - Main Application
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
import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
import ThemeToggle from './components/ThemeToggle';

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
  // Theme state - load from localStorage or default to dark
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Palette state - load from localStorage or default to standard
  const [palette, setPalette] = useState<'default' | 'colorblind'>(() => {
    const saved = localStorage.getItem('palette');
    return (saved === 'default' || saved === 'colorblind') ? saved : 'default';
  });

  // Apply theme to document root and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply palette to document root and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    localStorage.setItem('palette', palette);
  }, [palette]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Toggle palette function
  const togglePalette = () => {
    setPalette(prev => prev === 'default' ? 'colorblind' : 'default');
  };
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
  useEffect(() => {
    if (state.snrDb > maxSnr) {
      setSnrDb(maxSnr);
    }
  }, [state.snrDb, maxSnr, setSnrDb]);

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return;
        }
      }

      if (event.code === 'Space') {
        event.preventDefault();
        state.isPlaying ? pause() : play();
        return;
      }

      if (event.key === 's' || event.key === 'S') {
        if (!state.isPlaying) {
          step();
        }
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        reset();
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const delta = event.key === 'ArrowUp' ? 0.5 : -0.5;
        const next = Math.min(maxSnr, Math.max(-5, state.snrDb + delta));
        setSnrDb(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isPlaying, state.snrDb, maxSnr, play, pause, step, reset, setSnrDb]);

  return (
    <div
      className="min-h-screen p-4 md:p-6 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Skip to main content link for screen readers */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Main container with max width for large screens */}
      <div className="max-w-7xl mx-auto space-y-4">

        {/* ============================================================= */}
        {/* HEADER SECTION */}
        {/* ============================================================= */}
        <header
          className="rounded-lg p-4 border transition-colors"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--bg-border)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">
                Digital Modulation Simulator
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                This simulator allows you to explore the bit error rate performance of major digital modulation schemes under additive white Gaussian noise (AWGN).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <button
                onClick={togglePalette}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-150 ${
                  palette === 'colorblind'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
                title={palette === 'colorblind'
                  ? 'Switch to default color palette'
                  : 'Switch to color-blind safe palette'}
                aria-label={palette === 'colorblind'
                  ? 'Switch to default color palette'
                  : 'Switch to color-blind safe palette'}
              >
                {palette === 'colorblind' ? 'Palette: Safe' : 'Palette: Default'}
              </button>
              <Link
                to="/dig-deeper"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors text-white"
              >
                Dig Deeper
              </Link>
              <Link
                to="/quiz"
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors text-white"
              >
                Take Quiz
              </Link>
              <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                <div>EE597 - Wireless Networks</div>
                <div>University of Southern California</div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* START HERE SECTION */}
        {/* ============================================================= */}
        <section
          className="rounded-lg p-4 border border-cyan-700/50"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(6, 78, 59, 0.3)' : 'rgba(103, 232, 249, 0.1)',
          }}
          aria-labelledby="start-here-heading"
        >
          <h2 id="start-here-heading" className="text-lg font-bold text-cyan-400 mb-2">Start Here</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Choose a <strong className="text-cyan-400">modulation scheme</strong> (BPSK, QPSK, 8-PSK, 16-QAM, or 64-QAM) and adjust the <strong className="text-cyan-400">SNR (Eb/N0)</strong> to see how noise affects performance.
            Press <strong className="text-green-400">Play</strong> to start transmitting symbols and watch the <strong>constellation diagram</strong> scatter due to noise.
            Observe how the <strong>simulated BER</strong> (red dots) converges to the <strong>theoretical curve</strong> (colored lines) as more bits are transmitted.
            Toggle <strong>bit labels</strong> to see Gray coding, and use <strong>zoom controls</strong> to examine constellation points in detail.
            Try comparing different modulation schemes at the same SNR to understand the trade-off between data rate and error performance.
          </p>
        </section>

        {/* ============================================================= */}
        {/* CONTROL PANEL */}
        {/* ============================================================= */}
        <main id="main-content" role="main">
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
          <div
            className="rounded-lg p-4 border transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--bg-border)'
            }}
          >
            <div className="text-sm mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
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
            showLabels={false}
            showUnitCircle={true}
            showGrid={true}
          />

          {/* BER Performance Plot - fixed range with all schemes shown */}
          <BERPlot
            scheme={state.scheme}
            currentSnrDb={state.snrDb}
            simulatedBER={state.bitCount > 0 ? currentBER : null}
            bitCount={state.bitCount}
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
          snrMin={-5}
          snrMax={maxSnr}
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
        </main>

        {/* ============================================================= */}
        {/* FOOTER - Educational Information */}
        {/* ============================================================= */}
        <footer
          className="rounded-lg p-4 border text-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--bg-border)',
            color: 'var(--text-muted)'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Reference */}
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Quick Reference</h3>
              <ul className="space-y-1">
                <li><strong className="text-cyan-400">I(t)</strong> = In-phase (cosine carrier)</li>
                <li><strong className="text-orange-400">Q(t)</strong> = Quadrature (sine carrier)</li>
                <li><strong>Eb/N0</strong> = Energy per bit / Noise density</li>
                <li><strong>BER</strong> = Bit Error Rate</li>
              </ul>
            </div>

            {/* Key Concepts */}
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Key Concepts</h3>
              <ul className="space-y-1">
                <li>Higher order modulation = more bits/symbol</li>
                <li>But also = closer points = more errors</li>
                <li>QPSK has same BER as BPSK (per bit)</li>
                <li>Gray coding minimizes bit errors</li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>About</h3>
              <p>
                This simulator demonstrates digital modulation over AWGN channels.
                Observe how noise affects the received constellation and how
                simulated BER converges to theoretical values.
              </p>
              <p className="mt-2">
                Developed by Bhaskar Krishnamachari with Claude Code and OpenAI Codex, January 2026
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
