/**
 * High-resolution timing engine with inspection and penalties.
 * Pure logic only — no UI, no timers, no DOM.
 */

import { Penalty, TimingResult, TimingState } from "./types";

/* Configuration & runtime state ------------------------------------------- */

export interface TimingEngineConfig {
  /** Inspection duration in milliseconds (commonly 0 or 15000). */
  inspectionDurationMs: number;
  /** When true (default), apply WCA-style inspection overage penalties. */
  enableInspectionPenalties?: boolean;
}

export interface TimeSource {
  now(): number; // typically performance.now()
}

export interface TimingEngineState {
  status: TimingState;
  config: TimingEngineConfig;
  timeSource: TimeSource;

  inspectionStartTs?: number;
  runStartTs?: number;
  runEndTs?: number;

  inspectionElapsedMs: number;
  inspectionPenalty: Penalty;
  manualPenalty: Penalty;

  result?: TimingResult;
}

/* Factory ----------------------------------------------------------------- */

export function createTimingEngineState(
  config: TimingEngineConfig,
  timeSource: TimeSource = { now: () => performance.now() },
): TimingEngineState {
  return {
    status: "idle",
    config,
    timeSource,
    inspectionElapsedMs: 0,
    inspectionPenalty: Penalty.None,
    manualPenalty: Penalty.None,
  };
}

/* Helpers ----------------------------------------------------------------- */

function combinePenalties(...penalties: Penalty[]): Penalty {
  if (penalties.some((p) => p === Penalty.DNF)) return Penalty.DNF;
  if (penalties.some((p) => p === Penalty.Plus2)) return Penalty.Plus2;
  return Penalty.None;
}

function applyPenaltyToDuration(
  baseMs: number,
  penalty: Penalty,
): number | null {
  if (penalty === Penalty.DNF) return null;
  if (penalty === Penalty.Plus2) return baseMs + 2000;
  return baseMs;
}

function computeInspectionPenalty(
  inspectionElapsedMs: number,
  config: TimingEngineConfig,
): Penalty {
  if (!config.enableInspectionPenalties) return Penalty.None;
  const limit = config.inspectionDurationMs;
  if (limit <= 0) return Penalty.None;
  if (inspectionElapsedMs <= limit) return Penalty.None;
  if (inspectionElapsedMs <= limit + 2000) return Penalty.Plus2;
  return Penalty.DNF;
}

/* Transitions -------------------------------------------------------------- */

/**
 * Handle spacebar-compatible toggle:
 * - idle/stopped -> start (inspection or running)
 * - inspection   -> begin solve (ends inspection)
 * - running      -> stop solve
 */
export function handleSpacebar(state: TimingEngineState): TimingEngineState {
  switch (state.status) {
    case "idle":
    case "stopped":
      return startOrInspect(state);
    case "inspection":
      return startRunningFromInspection(state);
    case "running":
      return stopSolve(state);
    default:
      return state;
  }
}

/** Begin inspection (if configured) or start running immediately. */
export function startOrInspect(state: TimingEngineState): TimingEngineState {
  const now = state.timeSource.now();
  const inspectionDurationMs = state.config.inspectionDurationMs ?? 0;

  if (inspectionDurationMs > 0) {
    return {
      ...state,
      status: "inspection",
      inspectionStartTs: now,
      inspectionElapsedMs: 0,
      inspectionPenalty: Penalty.None,
      manualPenalty: Penalty.None,
      runStartTs: undefined,
      runEndTs: undefined,
      result: undefined,
    };
  }

  // Start running immediately (no inspection)
  return {
    ...state,
    status: "running",
    inspectionStartTs: undefined,
    inspectionElapsedMs: 0,
    inspectionPenalty: Penalty.None,
    manualPenalty: Penalty.None,
    runStartTs: now,
    runEndTs: undefined,
    result: undefined,
  };
}

/**
 * Transition from inspection to running.
 * Computes inspection duration and penalty at transition time.
 */
export function startRunningFromInspection(
  state: TimingEngineState,
): TimingEngineState {
  if (state.status !== "inspection" || state.inspectionStartTs == null) {
    return state;
  }
  const now = state.timeSource.now();
  const inspectionElapsedMs = now - state.inspectionStartTs;
  const inspectionPenalty = computeInspectionPenalty(
    inspectionElapsedMs,
    state.config,
  );

  return {
    ...state,
    status: "running",
    inspectionElapsedMs,
    inspectionPenalty,
    runStartTs: now,
    runEndTs: undefined,
    result: undefined,
  };
}

/** Stop the running solve and compute the timing result. */
export function stopSolve(state: TimingEngineState): TimingEngineState {
  if (state.status !== "running" || state.runStartTs == null) return state;
  const now = state.timeSource.now();
  const rawDurationMs = now - state.runStartTs;

  const combinedPenalty = combinePenalties(
    state.inspectionPenalty,
    state.manualPenalty,
  );
  const finalDurationMs = applyPenaltyToDuration(
    rawDurationMs,
    combinedPenalty,
  );

  const timingResult: TimingResult = {
    startTs: state.runStartTs,
    endTs: now,
    inspectionDurationMs: state.inspectionElapsedMs,
    rawDurationMs,
    penalty: combinedPenalty,
    finalDurationMs,
  };

  return {
    ...state,
    status: "stopped",
    runEndTs: now,
    result: timingResult,
  };
}

/**
 * Apply a manual penalty after a solve has been stopped.
 * Recomputes final duration according to combined penalties.
 */
export function applyManualPenalty(
  state: TimingEngineState,
  penalty: Penalty,
): TimingEngineState {
  const manualPenalty = penalty;
  const combinedPenalty = combinePenalties(
    state.inspectionPenalty,
    manualPenalty,
  );

  if (state.result) {
    const finalDurationMs =
      state.result.rawDurationMs != null
        ? applyPenaltyToDuration(state.result.rawDurationMs, combinedPenalty)
        : null;

    return {
      ...state,
      manualPenalty,
      result: {
        ...state.result,
        penalty: combinedPenalty,
        finalDurationMs,
      },
    };
  }

  return {
    ...state,
    manualPenalty,
  };
}

/* Utility accessors ------------------------------------------------------- */

export function isReadyToStart(state: TimingEngineState): boolean {
  return state.status === "idle" || state.status === "stopped";
}

export function isInspection(state: TimingEngineState): boolean {
  return state.status === "inspection";
}

export function isRunning(state: TimingEngineState): boolean {
  return state.status === "running";
}

export function isStopped(state: TimingEngineState): boolean {
  return state.status === "stopped";
}
