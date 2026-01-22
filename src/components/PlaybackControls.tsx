/**
 * Playback Controls Component
 *
 * Provides play/pause, step, and reset controls for the simulation,
 * along with a speed slider to adjust the symbol generation rate.
 *
 * Control Functions:
 * - Play: Continuously generate and transmit symbols
 * - Pause: Stop generation but keep accumulated statistics
 * - Step: Generate one batch of symbols (for detailed analysis)
 * - Reset: Clear all statistics and start fresh
 *
 * The speed control affects how many symbols per second are generated.
 * Slower speeds make it easier to observe individual symbols;
 * faster speeds accumulate statistics more quickly for BER analysis.
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React from 'react';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface PlaybackControlsProps {
  /** Whether simulation is currently playing */
  isPlaying: boolean;
  /** Current playback speed (symbols per second) */
  speed: number;
  /** Callback to start playback */
  onPlay: () => void;
  /** Callback to pause playback */
  onPause: () => void;
  /** Callback to step one batch */
  onStep: () => void;
  /** Callback to reset simulation */
  onReset: () => void;
  /** Callback when speed changes */
  onSpeedChange: (speed: number) => void;
  /** Minimum speed (default: 10) */
  minSpeed?: number;
  /** Maximum speed (default: 1000) */
  maxSpeed?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PlaybackControls Component
 *
 * Renders playback buttons and speed slider for controlling the simulation.
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  minSpeed = 10,
  maxSpeed = 1000,
}) => {
  /**
   * Icon components for buttons (using Unicode symbols for simplicity)
   */
  const PlayIcon = () => <span className="text-lg">{'>'}</span>;
  const PauseIcon = () => <span className="text-lg">||</span>;
  const StepIcon = () => <span className="text-lg">{'>>'}</span>;
  const ResetIcon = () => <span className="text-lg">R</span>;

  /**
   * Calculate speed slider percentage for visual display.
   * Use logarithmic scale for better UX across wide range.
   */
  const logMin = Math.log10(minSpeed);
  const logMax = Math.log10(maxSpeed);
  const logValue = Math.log10(speed);
  const percentage = ((logValue - logMin) / (logMax - logMin)) * 100;

  /**
   * Handle speed slider change with logarithmic scaling.
   */
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(e.target.value);
    // Convert from linear slider to logarithmic speed
    const logSpeed = logMin + (sliderValue / 100) * (logMax - logMin);
    const newSpeed = Math.round(Math.pow(10, logSpeed));
    onSpeedChange(Math.max(minSpeed, Math.min(maxSpeed, newSpeed)));
  };

  return (
    <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Simulation playback controls">
      {/* Main control buttons */}
      <div className="flex gap-2">
        {/* Play/Pause toggle button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`
            px-4 py-2 rounded-md font-medium
            flex items-center gap-2
            transition-all duration-150
            ${isPlaying
              ? 'bg-orange-600 hover:bg-orange-500 text-white'
              : 'bg-green-600 hover:bg-green-500 text-white'
            }
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${isPlaying ? 'focus:ring-orange-500' : 'focus:ring-green-500'}
          `}
          title={isPlaying ? 'Pause the symbol generation and transmission' : 'Start generating and transmitting symbols continuously'}
          aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {/* Step button - generate one batch */}
        <button
          onClick={onStep}
          disabled={isPlaying}
          className={`
            px-4 py-2 rounded-md font-medium
            flex items-center gap-2
            bg-slate-700 text-slate-300
            transition-all duration-150
            ${isPlaying
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-slate-600 hover:text-white'
            }
            focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
          `}
          title="Generate and transmit a single batch of symbols (useful for observing individual symbol behavior)"
          aria-label="Step one batch of symbols"
        >
          <StepIcon />
          <span>Step</span>
        </button>

        {/* Reset button */}
        <button
          onClick={onReset}
          className={`
            px-4 py-2 rounded-md font-medium
            flex items-center gap-2
            bg-slate-700 text-slate-300
            hover:bg-red-600 hover:text-white
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          `}
          title="Reset the simulation, clearing all accumulated statistics and symbol history"
          aria-label="Reset simulation"
        >
          <ResetIcon />
          <span>Reset</span>
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-3 rounded-lg px-4 py-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }} id="speed-label">Speed:</span>

        {/* Speed slider */}
        <div className="relative w-32">
          <div className="h-1 bg-slate-600 rounded-full">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-150"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={percentage}
            onChange={handleSpeedChange}
            className="absolute top-0 w-full h-1 opacity-0 cursor-pointer"
            aria-label="Playback speed"
            aria-labelledby="speed-label"
            aria-valuemin={minSpeed}
            aria-valuemax={maxSpeed}
            aria-valuenow={speed}
            aria-valuetext={`${speed} symbols per second`}
            title="Control how fast symbols are generated (symbols per second). Slower = observe individual symbols; Faster = accumulate BER statistics quickly."
          />
        </div>

        {/* Speed value display */}
        <span className="font-mono text-sm text-cyan-400 min-w-[4rem]">
          {speed >= 1000 ? `${(speed / 1000).toFixed(1)}k` : speed}/s
        </span>
      </div>
    </div>
  );
};

export default PlaybackControls;
