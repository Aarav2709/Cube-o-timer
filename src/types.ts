export type TimingState = "idle" | "inspection" | "running" | "stopped";

export type HighResTimestamp = number;

export type DurationMs = number;

export enum Penalty {
  None = "none",
  Plus2 = "+2",
  DNF = "dnf",
}

export interface TimingResult {
  startTs: HighResTimestamp;
  endTs: HighResTimestamp;
  inspectionDurationMs: DurationMs;
  rawDurationMs: DurationMs;
  penalty: Penalty;
  finalDurationMs: DurationMs | null;
}

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

export type PuzzleId = WcaEventId | (string & {});

export interface ScrambleRequest {
  puzzleId: PuzzleId;
  seed?: string | number;
  lengthHint?: number;
}

export interface Scramble {
  puzzleId: PuzzleId;
  notation: string;
  state?: Record<string, unknown>;
  seed?: string | number;
}

export interface Scrambler {
  puzzleId: PuzzleId;
  generate(request: ScrambleRequest): Scramble;
}

export type SolveId = string;
export type SessionId = string;

export interface Solve {
  id: SolveId;
  sessionId: SessionId;
  puzzleId: PuzzleId;
  scramble: Scramble;
  timing: TimingResult;
  createdAt: string;
}

export interface Session {
  id: SessionId;
  name: string;
  puzzleId: PuzzleId;
  createdAt: string;
  inspectionEnabled: boolean;
}

export interface StatWindowResult {
  size: number;
  valueMs: DurationMs | null;
  indices: number[];
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
  moXAo5?: {
    x: number;
    result: StatWindowResult | null;
  };
}

export interface TimelinePoint {
  solveId: SolveId;
  index: number;
  finalDurationMs: DurationMs | null;
  penalty: Penalty;
  createdAt: string;
}

export interface PersonalBest {
  type: "single" | "ao5" | "ao12" | "mo3" | "custom";
  size?: number;
  valueMs: DurationMs;
  solveIds: SolveId[];
  achievedAt: string;
}

export interface SplitPhaseDefinition {
  name: string;
  order: number;
}

export interface SplitInstance {
  phase: string;
  timestampMs: DurationMs;
}

export interface SplitCapture {
  solveId: SolveId;
  phases: SplitInstance[];
}

export interface PersistedSettings {
  inspectionEnabled: boolean;
  trainingModeEnabled: boolean;
  moXAo5Value: number;
  splitPhases: SplitPhaseDefinition[];
  lastPuzzleId?: PuzzleId;
  hideTimeDuringSolve: boolean;
  showMilliseconds: boolean;
  holdToStart: boolean;
  confirmBeforeDelete: boolean;
  soundEnabled: boolean;
  timerTrigger: "spacebar" | "any" | "stackmat";
  freezeTime: number; // ms to hold before starting
}

export type CSTimerPenalty = "none" | "+2" | "DNF";

export interface CSTimerSolveImport {
  time: number;
  penalty: CSTimerPenalty;
  scramble?: string;
  date?: string;
}

export interface CSTimerImportData {
  solves: CSTimerSolveImport[];
  puzzle?: string;
  targetPuzzleId?: PuzzleId;
}

export interface PersistedData {
  schemaVersion: number;
  sessions: Session[];
  solves: Solve[];
  splits: SplitCapture[];
  settings?: PersistedSettings;
  activePuzzleId?: PuzzleId;
}

export const CURRENT_SCHEMA_VERSION = 1;
