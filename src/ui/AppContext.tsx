import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  ReactNode,
} from "react";
import {
  CURRENT_SCHEMA_VERSION,
  Penalty,
  PersistedData,
  PersistedSettings,
  PuzzleId,
  Scramble,
  Session,
  SessionId,
  Solve,
  SolveId,
  SplitCapture,
  SplitPhaseDefinition,
  TimingResult,
  WcaEventId,
  CSTimerImportData,
  CSTimerSolveImport,
} from "../types";
import { loadPersistedData, savePersistedData } from "../persistence";
import { generateScramble } from "../scrambleEngine";
import { computeSessionStats, SessionStatsResult } from "../statsEngine";

export interface AppSettings {
  inspectionEnabled: boolean;
  moXAo5Value: number;
  trainingModeEnabled: boolean;
  splitPhases: SplitPhaseDefinition[];
  lastPuzzleId?: PuzzleId;
  hideTimeDuringSolve: boolean;
  showMilliseconds: boolean;
  holdToStart: boolean;
  confirmBeforeDelete: boolean;
  soundEnabled: boolean;
  timerTrigger: "spacebar" | "any" | "stackmat";
  freezeTime: number;
}

export interface AppState {
  initialized: boolean;
  sessions: Session[];
  solves: Solve[];
  splits: SplitCapture[];
  activeSessionId: SessionId | null;
  activePuzzleId: PuzzleId;
  currentScramble: Scramble | null;
  settings: AppSettings;
}

type AppAction =
  | { type: "INIT"; payload: PersistedData }
  | { type: "SET_ACTIVE_SESSION"; payload: SessionId }
  | { type: "SET_ACTIVE_PUZZLE"; payload: PuzzleId }
  | { type: "SET_SCRAMBLE"; payload: Scramble }
  | { type: "ADD_SESSION"; payload: Session }
  | { type: "ADD_SOLVE"; payload: Solve }
  | { type: "ADD_SOLVES_BATCH"; payload: Solve[] }
  | {
      type: "UPDATE_SOLVE_PENALTY";
      payload: { solveId: SolveId; penalty: Penalty };
    }
  | { type: "DELETE_SOLVE"; payload: SolveId }
  | { type: "ADD_SPLIT_CAPTURE"; payload: SplitCapture }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppSettings> }
  | { type: "SET_SPLIT_PHASES"; payload: SplitPhaseDefinition[] };

export interface AppContextValue {
  state: AppState;
  stats: SessionStatsResult | null;
  activeSolves: Solve[];

  /* Actions */
  setActivePuzzle: (puzzleId: PuzzleId) => void;
  refreshScramble: () => void;
  addSolve: (timing: TimingResult, scramble: Scramble) => Solve;
  updateSolvePenalty: (solveId: SolveId, penalty: Penalty) => void;
  deleteSolve: (solveId: SolveId) => void;
  addSplitCapture: (capture: SplitCapture) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setSplitPhases: (phases: SplitPhaseDefinition[]) => void;
  importCSTimerData: (data: CSTimerImportData) => {
    imported: number;
    dnfs: number;
    plus2: number;
    puzzleId: PuzzleId;
  };
}

const WCA_EVENTS: WcaEventId[] = [
  "333",
  "222",
  "444",
  "555",
  "666",
  "777",
  "pyram",
  "skewb",
  "sq1",
  "clock",
  "minx",
];

const DEFAULT_SETTINGS: AppSettings = {
  inspectionEnabled: true,
  moXAo5Value: 12,
  trainingModeEnabled: false,
  splitPhases: [],
  hideTimeDuringSolve: false,
  showMilliseconds: false,
  holdToStart: true,
  confirmBeforeDelete: true,
  soundEnabled: false,
  timerTrigger: "spacebar",
  freezeTime: 300,
};

const INITIAL_STATE: AppState = {
  initialized: false,
  sessions: [],
  solves: [],
  splits: [],
  activeSessionId: null,
  activePuzzleId: "333",
  currentScramble: null,
  settings: DEFAULT_SETTINGS,
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function applyPenaltyToTiming(
  timing: TimingResult,
  penalty: Penalty,
): TimingResult {
  let finalDurationMs: number | null = timing.rawDurationMs;
  if (penalty === Penalty.DNF) {
    finalDurationMs = null;
  } else if (penalty === Penalty.Plus2) {
    finalDurationMs = timing.rawDurationMs + 2000;
  }
  return { ...timing, penalty, finalDurationMs };
}

function createDefaultSession(puzzleId: PuzzleId): Session {
  return {
    id: generateId(),
    name: `${puzzleId} Session`,
    puzzleId,
    createdAt: new Date().toISOString(),
    inspectionEnabled: true,
  };
}

function mapCSTimerPuzzle(csTimerPuzzle?: string): PuzzleId {
  if (!csTimerPuzzle) return "333";

  const mapping: Record<string, PuzzleId> = {
    "333": "333",
    "222": "222",
    "444": "444",
    "555": "555",
    "666": "666",
    "777": "777",
    pyram: "pyram",
    pyrm: "pyram",
    skewb: "skewb",
    skwb: "skewb",
    sq1: "sq1",
    sqrs: "sq1",
    clock: "clock",
    clkc: "clock",
    minx: "minx",
    mgmp: "minx",
  };

  const normalized = csTimerPuzzle.toLowerCase().replace(/[^a-z0-9]/g, "");
  return mapping[normalized] || "333";
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "INIT": {
      const { sessions, solves, splits } = action.payload;
      const persistedSettings: PersistedSettings = {
        ...DEFAULT_SETTINGS,
        ...(action.payload.settings ?? {}),
      };
      const activePuzzleId =
        action.payload.activePuzzleId ??
        persistedSettings.lastPuzzleId ??
        state.activePuzzleId;

      let activeSessions = sessions;
      let activeSessionId = state.activeSessionId;

      if (sessions.length === 0) {
        const defaultSession = createDefaultSession(activePuzzleId);
        activeSessions = [defaultSession];
        activeSessionId = defaultSession.id;
      } else {
        const sessionForPuzzle = sessions.find(
          (s) => s.puzzleId === activePuzzleId,
        );
        if (sessionForPuzzle) {
          activeSessionId = sessionForPuzzle.id;
        } else {
          const firstSession = sessions[0];
          activeSessionId = firstSession ? firstSession.id : null;
        }
      }

      const scramble = generateScramble({ puzzleId: activePuzzleId });

      return {
        ...state,
        initialized: true,
        sessions: activeSessions,
        solves,
        splits,
        activeSessionId,
        activePuzzleId,
        settings: persistedSettings,
        currentScramble: scramble,
      };
    }

    case "SET_ACTIVE_SESSION":
      return { ...state, activeSessionId: action.payload };

    case "SET_ACTIVE_PUZZLE": {
      const puzzleId = action.payload;
      let session = state.sessions.find((s) => s.puzzleId === puzzleId);
      let sessions = state.sessions;

      if (!session) {
        session = createDefaultSession(puzzleId);
        sessions = [...state.sessions, session];
      }

      const scramble = generateScramble({ puzzleId });
      const settings = { ...state.settings, lastPuzzleId: puzzleId };

      return {
        ...state,
        sessions,
        activePuzzleId: puzzleId,
        activeSessionId: session.id,
        currentScramble: scramble,
        settings,
      };
    }

    case "SET_SCRAMBLE":
      return { ...state, currentScramble: action.payload };

    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };

    case "ADD_SOLVE":
      return { ...state, solves: [...state.solves, action.payload] };

    case "ADD_SOLVES_BATCH":
      return { ...state, solves: [...state.solves, ...action.payload] };

    case "UPDATE_SOLVE_PENALTY": {
      const { solveId, penalty } = action.payload;
      return {
        ...state,
        solves: state.solves.map((solve) =>
          solve.id === solveId
            ? { ...solve, timing: applyPenaltyToTiming(solve.timing, penalty) }
            : solve,
        ),
      };
    }

    case "DELETE_SOLVE":
      return {
        ...state,
        solves: state.solves.filter((s) => s.id !== action.payload),
        splits: state.splits.filter((s) => s.solveId !== action.payload),
      };

    case "ADD_SPLIT_CAPTURE": {
      const existing = state.splits.findIndex(
        (s) => s.solveId === action.payload.solveId,
      );
      if (existing >= 0) {
        const newSplits = [...state.splits];
        newSplits[existing] = action.payload;
        return { ...state, splits: newSplits };
      }
      return { ...state, splits: [...state.splits, action.payload] };
    }

    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case "SET_SPLIT_PHASES":
      return {
        ...state,
        settings: { ...state.settings, splitPhases: action.payload },
      };

    default:
      return state;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}

export { WCA_EVENTS };

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  useEffect(() => {
    loadPersistedData()
      .then((data) => {
        dispatch({ type: "INIT", payload: data });
      })
      .catch((err) => {
        console.error("Failed to load persisted data:", err);
        dispatch({
          type: "INIT",
          payload: {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            sessions: [],
            solves: [],
            splits: [],
            settings: DEFAULT_SETTINGS,
            activePuzzleId: INITIAL_STATE.activePuzzleId,
          },
        });
      });
  }, []);

  useEffect(() => {
    if (!state.initialized) return;

    const timeout = setTimeout(() => {
      savePersistedData({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        sessions: state.sessions,
        solves: state.solves,
        splits: state.splits,
        settings: state.settings,
        activePuzzleId: state.activePuzzleId,
      }).catch((err) => {
        console.error("Failed to save data:", err);
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    state.initialized,
    state.sessions,
    state.solves,
    state.splits,
    state.settings,
    state.activePuzzleId,
  ]);

  const activeSolves = useMemo(() => {
    if (!state.activeSessionId) return [];
    return state.solves
      .filter((s) => s.sessionId === state.activeSessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [state.solves, state.activeSessionId]);

  const stats = useMemo(() => {
    if (activeSolves.length === 0) return null;
    return computeSessionStats(activeSolves, {
      moXAo5: state.settings.moXAo5Value,
    });
  }, [activeSolves, state.settings.moXAo5Value]);

  const setActivePuzzle = useCallback((puzzleId: PuzzleId) => {
    dispatch({ type: "SET_ACTIVE_PUZZLE", payload: puzzleId });
  }, []);

  const refreshScramble = useCallback(() => {
    const scramble = generateScramble({ puzzleId: state.activePuzzleId });
    dispatch({ type: "SET_SCRAMBLE", payload: scramble });
  }, [state.activePuzzleId]);

  const addSolve = useCallback(
    (timing: TimingResult, scramble: Scramble): Solve => {
      const solve: Solve = {
        id: generateId(),
        sessionId: state.activeSessionId!,
        puzzleId: state.activePuzzleId,
        scramble,
        timing,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_SOLVE", payload: solve });
      const newScramble = generateScramble({ puzzleId: state.activePuzzleId });
      dispatch({ type: "SET_SCRAMBLE", payload: newScramble });
      return solve;
    },
    [state.activeSessionId, state.activePuzzleId],
  );

  const updateSolvePenalty = useCallback(
    (solveId: SolveId, penalty: Penalty) => {
      dispatch({ type: "UPDATE_SOLVE_PENALTY", payload: { solveId, penalty } });
    },
    [],
  );

  const deleteSolve = useCallback((solveId: SolveId) => {
    dispatch({ type: "DELETE_SOLVE", payload: solveId });
  }, []);

  const addSplitCapture = useCallback((capture: SplitCapture) => {
    dispatch({ type: "ADD_SPLIT_CAPTURE", payload: capture });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
  }, []);

  const setSplitPhases = useCallback((phases: SplitPhaseDefinition[]) => {
    dispatch({ type: "SET_SPLIT_PHASES", payload: phases });
  }, []);

  const importCSTimerData = useCallback(
    (data: CSTimerImportData) => {
      const puzzleId = data.targetPuzzleId ?? mapCSTimerPuzzle(data.puzzle);
      let session = state.sessions.find((s) => s.puzzleId === puzzleId);

      if (!session) {
        session = createDefaultSession(puzzleId);
        dispatch({ type: "ADD_SESSION", payload: session });
      }

      const newSolves: Solve[] = [];
      let imported = 0;
      let dnfs = 0;
      let plus2 = 0;

      data.solves.forEach((csSolve: CSTimerSolveImport, index: number) => {
        const baseTime = csSolve.time;
        if (!Number.isFinite(baseTime) || baseTime <= 0) return;

        let penalty: Penalty = Penalty.None;
        const penaltyCode =
          typeof csSolve.penalty === "string"
            ? csSolve.penalty.toUpperCase()
            : "NONE";
        if (penaltyCode === "+2") {
          penalty = Penalty.Plus2;
        } else if (penaltyCode === "DNF") {
          penalty = Penalty.DNF;
        }

        let finalDurationMs: number | null = baseTime;
        if (penalty === Penalty.DNF) {
          dnfs += 1;
          finalDurationMs = null;
        } else if (penalty === Penalty.Plus2) {
          plus2 += 1;
          finalDurationMs = baseTime + 2000;
        }

        const timing: TimingResult = {
          startTs: 0,
          endTs: baseTime,
          inspectionDurationMs: 0,
          rawDurationMs: baseTime,
          penalty,
          finalDurationMs,
        };

        const scramble: Scramble = {
          puzzleId,
          notation: csSolve.scramble || `[Imported solve ${index + 1}]`,
        };

        const createdAt = csSolve.date || new Date().toISOString();

        newSolves.push({
          id: generateId(),
          sessionId: session!.id,
          puzzleId,
          scramble,
          timing,
          createdAt,
        });
        imported += 1;
      });

      if (newSolves.length > 0) {
        newSolves.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        dispatch({ type: "ADD_SOLVES_BATCH", payload: newSolves });

        if (state.activePuzzleId !== puzzleId) {
          dispatch({ type: "SET_ACTIVE_PUZZLE", payload: puzzleId });
        }
      }

      return { imported, dnfs, plus2, puzzleId };
    },
    [state.sessions, state.activePuzzleId],
  );

  const value: AppContextValue = {
    state,
    stats,
    activeSolves,
    setActivePuzzle,
    refreshScramble,
    addSolve,
    updateSolvePenalty,
    deleteSolve,
    addSplitCapture,
    updateSettings,
    setSplitPhases,
    importCSTimerData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
