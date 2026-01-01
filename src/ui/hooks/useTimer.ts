import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTimingEngineState,
  handleSpacebar,
  applyManualPenalty,
  TimingEngineState,
  TimingEngineConfig,
} from "../../timingEngine";
import { Penalty, TimingResult, TimingState, DurationMs } from "../../types";

export interface UseTimerOptions {
  inspectionEnabled: boolean;
  onSolveComplete?: (result: TimingResult) => void;
}

export interface UseTimerReturn {
  status: TimingState;
  displayTime: DurationMs;
  inspectionRemaining: number | null;
  result: TimingResult | null;
  isHolding: boolean;
  isReady: boolean;

  setPenalty: (penalty: Penalty) => void;
  reset: () => void;
}

const HOLD_THRESHOLD_MS = 300;
const INSPECTION_DURATION_MS = 15000;

export function useTimer(options: UseTimerOptions): UseTimerReturn {
  const { inspectionEnabled, onSolveComplete } = options;

  const config: TimingEngineConfig = {
    inspectionDurationMs: inspectionEnabled ? INSPECTION_DURATION_MS : 0,
    enableInspectionPenalties: true,
  };

  const [engineState, setEngineState] = useState<TimingEngineState>(() =>
    createTimingEngineState(config),
  );
  const [displayTime, setDisplayTime] = useState<DurationMs>(0);
  const [inspectionRemaining, setInspectionRemaining] = useState<number | null>(
    null,
  );
  const [isHolding, setIsHolding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const holdStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const keyDownRef = useRef(false);
  const touchActiveRef = useRef(false);

  useEffect(() => {
    setEngineState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        inspectionDurationMs: inspectionEnabled ? INSPECTION_DURATION_MS : 0,
      },
    }));
  }, [inspectionEnabled]);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();

      if (engineState.status === "running" && engineState.runStartTs != null) {
        setDisplayTime(now - engineState.runStartTs);
      } else if (
        engineState.status === "inspection" &&
        engineState.inspectionStartTs != null
      ) {
        const elapsed = now - engineState.inspectionStartTs;
        const remaining = Math.max(0, INSPECTION_DURATION_MS - elapsed);
        setInspectionRemaining(Math.ceil(remaining / 1000));

        if (elapsed >= INSPECTION_DURATION_MS + 2000) {
          const newState = handleSpacebar(engineState);
          const stoppedState = handleSpacebar(newState);
          setEngineState(applyManualPenalty(stoppedState, Penalty.DNF));
          setInspectionRemaining(null);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (
      engineState.status === "running" ||
      engineState.status === "inspection"
    ) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    engineState.status,
    engineState.runStartTs,
    engineState.inspectionStartTs,
  ]);

  const startHold = useCallback(() => {
    const status = engineState.status;
    if (status === "idle" || status === "stopped") {
      holdStartRef.current = performance.now();
      setIsHolding(true);
      setIsReady(false);
    }
  }, [engineState.status]);

  const releaseHold = useCallback(() => {
    const status = engineState.status;

    if (status === "idle" || status === "stopped") {
      const holdDuration = holdStartRef.current
        ? performance.now() - holdStartRef.current
        : 0;

      if (holdDuration >= HOLD_THRESHOLD_MS) {
        const newState = handleSpacebar(engineState);
        setEngineState(newState);
        setDisplayTime(0);

        if (newState.status === "inspection") {
          setInspectionRemaining(Math.ceil(INSPECTION_DURATION_MS / 1000));
        }
      }

      holdStartRef.current = null;
      setIsHolding(false);
      setIsReady(false);
    }
  }, [engineState]);

  const stopTimer = useCallback(() => {
    const status = engineState.status;

    if (status === "running") {
      const newState = handleSpacebar(engineState);
      setEngineState(newState);
      setDisplayTime(newState.result?.rawDurationMs ?? 0);

      if (newState.result && onSolveComplete) {
        onSolveComplete(newState.result);
      }
    } else if (status === "inspection") {
      const newState = handleSpacebar(engineState);
      setEngineState(newState);
      setInspectionRemaining(null);
      setDisplayTime(0);
    }
  }, [engineState, onSolveComplete]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();

      if (keyDownRef.current) return;
      keyDownRef.current = true;

      const status = engineState.status;

      if (status === "running") {
        stopTimer();
      } else if (status === "inspection") {
        stopTimer();
      } else if (status === "idle" || status === "stopped") {
        startHold();
      }
    },
    [engineState.status, stopTimer, startHold],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();

      keyDownRef.current = false;
      releaseHold();
    },
    [releaseHold],
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof Element && e.target.closest("button"))
      ) {
        return;
      }

      const status = engineState.status;

      if (status === "running" || status === "inspection") {
        e.preventDefault();
        touchActiveRef.current = true;
        stopTimer();
      } else if (status === "idle" || status === "stopped") {
        e.preventDefault();
        touchActiveRef.current = true;
        startHold();
      }
    },
    [engineState.status, stopTimer, startHold],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchActiveRef.current) return;
      e.preventDefault();
      touchActiveRef.current = false;
      releaseHold();
    },
    [releaseHold],
  );

  const handleTouchCancel = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;
    holdStartRef.current = null;
    setIsHolding(false);
    setIsReady(false);
  }, []);

  useEffect(() => {
    if (!isHolding) return;

    const checkReady = () => {
      if (holdStartRef.current) {
        const elapsed = performance.now() - holdStartRef.current;
        if (elapsed >= HOLD_THRESHOLD_MS) {
          setIsReady(true);
        } else {
          requestAnimationFrame(checkReady);
        }
      }
    };

    const frame = requestAnimationFrame(checkReady);
    return () => cancelAnimationFrame(frame);
  }, [isHolding]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    handleKeyDown,
    handleKeyUp,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
  ]);

  useEffect(() => {
    const handleBlur = () => {
      if (keyDownRef.current) {
        keyDownRef.current = false;
        releaseHold();
      }
      if (touchActiveRef.current) {
        touchActiveRef.current = false;
        holdStartRef.current = null;
        setIsHolding(false);
        setIsReady(false);
      }
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [releaseHold]);

  const setPenalty = useCallback((penalty: Penalty) => {
    setEngineState((prev) => {
      if (prev.status !== "stopped" || !prev.result) return prev;
      return applyManualPenalty(prev, penalty);
    });
  }, []);

  const reset = useCallback(() => {
    setEngineState(createTimingEngineState(config));
    setDisplayTime(0);
    setInspectionRemaining(null);
    setIsHolding(false);
    setIsReady(false);
  }, [config]);

  return {
    status: engineState.status,
    displayTime,
    inspectionRemaining,
    result: engineState.result ?? null,
    isHolding,
    isReady,
    setPenalty,
    reset,
  };
}
