/**
 * Core domain types for KubeTimr.
 */

export type TimingState = "idle" | "inspection" | "running" | "stopped";

export type HighResTimestamp = number; // milliseconds from performance.now()

export type DurationMs = number;

export enum Penalty {
  None = "none",
  Plus2 = "+2",
  DNF = "dnf",
}

/**
 * Result of a single timing measurement (excluding scramble metadata).
 */
export interface TimingResult {
  startTs: HighResTimestamp;
  endTs: HighResTimestamp;
  inspectionDurationMs: DurationMs;
  rawDurationMs: DurationMs; // end - start
  penalty: Penalty;
  finalDurationMs: DurationMs | null; // null when DNF
}

/**
 * Supported WCA event identifiers (stringly to allow persistence without enums).
 */
export type WcaEventId =
  | "222"
  | "333"
  | "444"
  | "555"
  | "666"
  | "777"
  | "pyram"
  | "skewb"
  | "sq1"
  | "clock"
  | "minx";

/**
 * Generic puzzle identifier to allow non-WCA extension.
 */
export type PuzzleId = WcaEventId | (string & {});

/**
 * Options for requesting a scramble.
 */
export interface ScrambleRequest {
  puzzleId: PuzzleId;
  /**
   * Optional deterministic seed for reproducible scrambles.
   * Implementations should be deterministic for identical seeds.
   */
  seed?: string | number;
  /**
   * Optional length override for non-random-state scramblers.
   */
  lengthHint?: number;
}

/**
 * A generated scramble.
 */
export interface Scramble {
  puzzleId: PuzzleId;
  notation: string;
  /**
   * Optional serialized random-state metadata (e.g., cubie/corner orientation)
   * to enable verification or regeneration.
   */
  state?: Record<string, unknown>;
  seed?: string | number;
}

/**
 * Contract for a scrambler implementation.
 */
export interface Scrambler {
  puzzleId: PuzzleId;
  generate(request: ScrambleRequest): Scramble;
}

export type SolveId = string;
export type SessionId = string;

/**
 * A single solve record combining timing and scramble.
 */
export interface Solve {
  id: SolveId;
  sessionId: SessionId;
  puzzleId: PuzzleId;
  scramble: Scramble;
  timing: TimingResult;
  /**
   * Wall-clock timestamps (ISO) for UI/graphs; independent of high-res timing.
   */
  createdAt: string; // ISO 8601
}

/**
 * A session groups solves and configuration (e.g., inspection settings).
 */
export interface Session {
  id: SessionId;
  name: string;
  puzzleId: PuzzleId;
  createdAt: string; // ISO 8601
  inspectionEnabled: boolean; // 0s vs 15s (or future values)
}

export interface StatWindowResult {
  size: number;
  valueMs: DurationMs | null; // null denotes DNF/invalid
  indices: number[]; // indices of solves contributing (relative to timeline)
  isDnf: boolean;
}

export interface RollingStats {
  count: number;
  bestMs: DurationMs | null;
  worstMs: DurationMs | null;
  meanMs: DurationMs | null;
  mo3: StatWindowResult | null;
  ao5: StatWindowResult | null;
  ao12: StatWindowResult | null;
  ao50: StatWindowResult | null;
  ao100: StatWindowResult | null;
  ao1000: StatWindowResult | null;
  /**
   * Arbitrary mean-of-X average-of-5 (MoXAo5) per requirement.
   */
  moXAo5?: {
    x: number;
    result: StatWindowResult | null;
  };
}

/**
 * Data point for graphing timelines.
 */
export interface TimelinePoint {
  solveId: SolveId;
  index: number; // chronological order
  finalDurationMs: DurationMs | null;
  penalty: Penalty;
  createdAt: string;
}

/**
 * Personal best descriptor.
 */
export interface PersonalBest {
  type: "single" | "ao5" | "ao12" | "mo3" | "custom";
  size?: number; // for rolling windows
  valueMs: DurationMs;
  solveIds: SolveId[];
  achievedAt: string;
}

export interface SplitPhaseDefinition {
  name: string;
  order: number;
}

/**
 * A split capture for a single solve.
 */
export interface SplitInstance {
  phase: string;
  timestampMs: DurationMs; // offset from solve start
}

export interface SplitCapture {
  solveId: SolveId;
  phases: SplitInstance[];
}

export interface PersistedData {
  schemaVersion: number;
  sessions: Session[];
  solves: Solve[];
  splits: SplitCapture[];
}

export const CURRENT_SCHEMA_VERSION = 1;
