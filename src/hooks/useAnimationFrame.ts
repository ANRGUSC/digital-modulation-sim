/**
 * Animation Frame Hook
 *
 * Provides a smooth animation loop using requestAnimationFrame.
 * This is essential for keeping the UI responsive while running
 * continuous simulations.
 *
 * Why requestAnimationFrame?
 * ==========================
 * - Synchronized with display refresh rate (typically 60 Hz)
 * - Automatically pauses when tab is not visible (saves CPU)
 * - Provides smooth animations without setInterval quirks
 * - Better battery life on mobile devices
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook that calls a callback function on each animation frame.
 *
 * The callback receives the time delta since the last frame, which
 * can be used to maintain consistent animation speeds regardless
 * of frame rate.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useAnimationFrame((deltaTime) => {
 *     // Update simulation state
 *     // deltaTime is in milliseconds
 *   }, isRunning);
 * }
 * ```
 *
 * @param callback - Function called each frame with deltaTime (ms)
 * @param isRunning - Whether the animation should be running
 */
export function useAnimationFrame(
  callback: (deltaTime: number) => void,
  isRunning: boolean
): void {
  // Store callback in a ref to avoid re-creating the animation loop
  // when callback changes (which would cause stuttering)
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Animation loop
  useEffect(() => {
    if (!isRunning) {
      // Stop animation
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    // Start animation
    const animate = (currentTime: number) => {
      // Calculate time since last frame
      if (lastTimeRef.current !== null) {
        const deltaTime = currentTime - lastTimeRef.current;
        // Call the user's callback with delta time
        callbackRef.current(deltaTime);
      }

      lastTimeRef.current = currentTime;

      // Request next frame
      frameRef.current = requestAnimationFrame(animate);
    };

    // Kick off the animation loop
    frameRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isRunning]);
}

/**
 * Hook that provides a throttled animation callback.
 *
 * Useful when you want to run at a specific rate rather than
 * every frame (e.g., update simulation at 30 Hz but render at 60 Hz).
 *
 * @param callback - Function to call at the specified rate
 * @param isRunning - Whether the animation should be running
 * @param targetFps - Target frames per second (default 60)
 */
export function useThrottledAnimationFrame(
  callback: (deltaTime: number) => void,
  isRunning: boolean,
  targetFps: number = 60
): void {
  const accumulatedTimeRef = useRef(0);
  const targetInterval = 1000 / targetFps; // ms per frame

  const throttledCallback = useCallback(
    (deltaTime: number) => {
      accumulatedTimeRef.current += deltaTime;

      // Only call callback when enough time has accumulated
      while (accumulatedTimeRef.current >= targetInterval) {
        callback(targetInterval);
        accumulatedTimeRef.current -= targetInterval;
      }
    },
    [callback, targetInterval]
  );

  useAnimationFrame(throttledCallback, isRunning);
}

/**
 * Hook that measures actual frame rate.
 *
 * Useful for debugging performance issues and displaying FPS counter.
 *
 * @returns Object with current FPS and average FPS
 */
export function useFrameRate(): { fps: number; avgFps: number } {
  const fpsRef = useRef(60);
  const avgFpsRef = useRef(60);
  const frameTimesRef = useRef<number[]>([]);

  useAnimationFrame((deltaTime) => {
    // Calculate instantaneous FPS
    fpsRef.current = 1000 / deltaTime;

    // Track last 60 frame times for average
    frameTimesRef.current.push(deltaTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Calculate average FPS
    const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
    avgFpsRef.current = 1000 / avgDelta;
  }, true);

  return {
    fps: Math.round(fpsRef.current),
    avgFps: Math.round(avgFpsRef.current),
  };
}
