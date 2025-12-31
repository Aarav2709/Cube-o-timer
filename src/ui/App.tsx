import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { AppProvider, useAppContext } from "./AppContext";
import { useTimer } from "./hooks/useTimer";
import TimerDisplay from "./components/TimerDisplay";
import ScrambleDisplay from "./components/ScrambleDisplay";
import StatsPanel from "./components/StatsPanel";
import SolveList from "./components/SolveList";
import SplitMarkers from "./components/SplitMarkers";
import SplitBreakdown from "./components/SplitBreakdown";
import SplitEditor from "./components/SplitEditor";
import Settings from "./components/Settings";
import {
  Penalty,
  PuzzleId,
  SplitCapture,
  SplitInstance,
  SolveId,
  TimingResult,
} from "../types";

const styles = {
  app: {
    display: "flex",
    flexDirection: "row",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--color-void)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-ui)",
  } as React.CSSProperties,

  leftPanel: {
    display: "flex",
    flexDirection: "column",
    width: "var(--sidebar-width)",
    minWidth: "180px",
    maxWidth: "var(--sidebar-max-width)",
    height: "100%",
    flexShrink: 0,
    backgroundColor: "var(--color-surface)",
    borderRight: "1px solid var(--color-border-subtle)",
    transition: "opacity var(--transition-normal)",
  } as React.CSSProperties,

  centerColumn: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    height: "100%",
    position: "relative",
  } as React.CSSProperties,

  scrambleArea: {
    flexShrink: 0,
    padding: "10px 20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    transition: "opacity var(--transition-normal)",
  } as React.CSSProperties,

  timerZone: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "2vh",
    paddingBottom: "4vh",
    position: "relative",
    minHeight: 0,
  } as React.CSSProperties,

  rightPanel: {
    display: "flex",
    flexDirection: "column",
    width: "var(--sidebar-width)",
    minWidth: "180px",
    maxWidth: "var(--sidebar-max-width)",
    height: "100%",
    flexShrink: 0,
    backgroundColor: "var(--color-surface)",
    borderLeft: "1px solid var(--color-border-subtle)",
    transition: "opacity var(--transition-normal)",
  } as React.CSSProperties,

  statsSection: {
    flexShrink: 0,
    padding: "var(--space-2)",
    borderBottom: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  settingsSection: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    padding: "var(--space-2)",
  } as React.CSSProperties,

  splitBreakdownArea: {
    width: "100%",
    maxWidth: "360px",
    padding: "var(--space-2)",
    marginTop: "var(--space-1)",
  } as React.CSSProperties,

  splitMarkersOverlay: {
    position: "absolute",
    right: "var(--space-3)",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
  } as React.CSSProperties,

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  modalContent: {
    maxWidth: "380px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
  } as React.CSSProperties,

  trainingButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    padding: "var(--space-1) var(--space-2)",
    marginTop: "var(--space-2)",
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-sm)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    width: "100%",
  } as React.CSSProperties,

  trainingButtonKey: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "12px",
    padding: "0 3px",
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    fontWeight: 500,
    lineHeight: 1.3,
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "2px",
  } as React.CSSProperties,

  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    height: "100vh",
    fontSize: "var(--text-lg)",
    color: "var(--color-text-muted)",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  } as React.CSSProperties,

  fullscreenHint: {
    position: "fixed",
    top: "var(--space-2)",
    right: "var(--space-2)",
    padding: "var(--space-1) var(--space-2)",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-sm)",
    opacity: 0,
    transition: "opacity var(--transition-normal)",
    pointerEvents: "none",
    zIndex: 50,
  } as React.CSSProperties,

  importNotice: {
    position: "fixed",
    bottom: "var(--space-2)",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "var(--space-1) var(--space-3)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-md)",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
    letterSpacing: "0.02em",
    zIndex: 60,
  } as React.CSSProperties,
};

const PUZZLE_LABELS: Record<string, string> = {
  "333": "3×3",
  "222": "2×2",
  "444": "4×4",
  "555": "5×5",
  "666": "6×6",
  "777": "7×7",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  clock: "Clock",
  minx: "Megaminx",
};

function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element })
      .webkitFullscreenElement ||
    (document as unknown as { mozFullScreenElement?: Element })
      .mozFullScreenElement ||
    (document as unknown as { msFullscreenElement?: Element })
      .msFullscreenElement
  );
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (!isFullscreen()) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (
        (elem as unknown as { webkitRequestFullscreen?: () => Promise<void> })
          .webkitRequestFullscreen
      ) {
        await (
          elem as unknown as { webkitRequestFullscreen: () => Promise<void> }
        ).webkitRequestFullscreen();
      } else if (
        (elem as unknown as { mozRequestFullScreen?: () => Promise<void> })
          .mozRequestFullScreen
      ) {
        await (
          elem as unknown as { mozRequestFullScreen: () => Promise<void> }
        ).mozRequestFullScreen();
      } else if (
        (elem as unknown as { msRequestFullscreen?: () => Promise<void> })
          .msRequestFullscreen
      ) {
        await (
          elem as unknown as { msRequestFullscreen: () => Promise<void> }
        ).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (
        (document as unknown as { webkitExitFullscreen?: () => Promise<void> })
          .webkitExitFullscreen
      ) {
        await (
          document as unknown as { webkitExitFullscreen: () => Promise<void> }
        ).webkitExitFullscreen();
      } else if (
        (document as unknown as { mozCancelFullScreen?: () => Promise<void> })
          .mozCancelFullScreen
      ) {
        await (
          document as unknown as { mozCancelFullScreen: () => Promise<void> }
        ).mozCancelFullScreen();
      } else if (
        (document as unknown as { msExitFullscreen?: () => Promise<void> })
          .msExitFullscreen
      ) {
        await (
          document as unknown as { msExitFullscreen: () => Promise<void> }
        ).msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn("Fullscreen toggle failed:", err);
  }
}

function AppContent() {
  const {
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
  } = useAppContext();

  const [currentSplits, setCurrentSplits] = useState<SplitInstance[]>([]);
  const [lastSolveCapture, setLastSolveCapture] = useState<SplitCapture | null>(
    null,
  );
  const [showSplitEditor, setShowSplitEditor] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [selectedSolveId, setSelectedSolveId] = useState<SolveId | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const fullscreenHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const cursorHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const importNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleSolveComplete = useCallback(
    (result: TimingResult) => {
      if (!state.currentScramble) return;

      const solve = addSolve(result, state.currentScramble);
      setSelectedSolveId(solve.id);

      if (state.settings.trainingModeEnabled && currentSplits.length > 0) {
        const capture: SplitCapture = {
          solveId: solve.id,
          phases: currentSplits,
        };
        addSplitCapture(capture);
        setLastSolveCapture(capture);
      }

      setCurrentSplits([]);
    },
    [
      state.currentScramble,
      state.settings.trainingModeEnabled,
      currentSplits,
      addSolve,
      addSplitCapture,
    ],
  );

  const timer = useTimer({
    inspectionEnabled: state.settings.inspectionEnabled,
    onSolveComplete: handleSolveComplete,
  });

  const handlePuzzleChange = useCallback(
    (puzzleId: PuzzleId) => {
      timer.reset();
      setCurrentSplits([]);
      setLastSolveCapture(null);
      setSelectedSolveId(null);
      setActivePuzzle(puzzleId);
    },
    [setActivePuzzle, timer],
  );

  const handleMarkSplit = useCallback((phase: string, timestampMs: number) => {
    setCurrentSplits((prev) => {
      const existing = prev.findIndex((s) => s.phase === phase);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { phase, timestampMs };
        return updated;
      }
      return [...prev, { phase, timestampMs }];
    });
  }, []);

  useEffect(() => {
    if (timer.status === "running" || timer.status === "inspection") {
      setCurrentSplits([]);
      setLastSolveCapture(null);
    }
  }, [timer.status]);

  useEffect(() => {
    if (activeSolves.length === 0) {
      setSelectedSolveId(null);
      return;
    }
    if (
      !selectedSolveId ||
      !activeSolves.some((s) => s.id === selectedSolveId)
    ) {
      setSelectedSolveId(activeSolves[activeSolves.length - 1]?.id ?? null);
    }
  }, [activeSolves, selectedSolveId]);

  const handleDeleteSolve = useCallback(
    (solveId: SolveId) => {
      deleteSolve(solveId);
      setSelectedSolveId((prev) => {
        if (prev !== solveId) return prev;
        const remaining = activeSolves.filter((s) => s.id !== solveId);
        const fallback = remaining[remaining.length - 1]?.id ?? null;
        return fallback;
      });
    },
    [deleteSolve, activeSolves],
  );

  const timerActive =
    timer.status === "running" || timer.status === "inspection";

  const selectedSolve = useMemo(
    () => activeSolves.find((s) => s.id === selectedSolveId) ?? null,
    [activeSolves, selectedSolveId],
  );

  const isLatestPB = useMemo(() => {
    if (!stats || activeSolves.length === 0) return false;
    const latestSolve = activeSolves[activeSolves.length - 1];
    if (!latestSolve || !latestSolve.timing.finalDurationMs) return false;
    return stats.personalBests.some(
      (pb) => pb.type === "single" && pb.solveIds.includes(latestSolve.id),
    );
  }, [stats, activeSolves]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = isFullscreen();
      setIsFullscreenMode(fs);

      if (fs) {
        setShowFullscreenHint(true);
        if (fullscreenHintTimeoutRef.current) {
          clearTimeout(fullscreenHintTimeoutRef.current);
        }
        fullscreenHintTimeoutRef.current = setTimeout(() => {
          setShowFullscreenHint(false);
        }, 2000);
      } else {
        setShowFullscreenHint(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange,
      );
      if (fullscreenHintTimeoutRef.current) {
        clearTimeout(fullscreenHintTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFullscreenMode) {
      document.body.style.cursor = "";
      if (cursorHideTimeoutRef.current) {
        clearTimeout(cursorHideTimeoutRef.current);
      }
      return;
    }

    const resetCursor = () => {
      document.body.style.cursor = "";
      if (cursorHideTimeoutRef.current) {
        clearTimeout(cursorHideTimeoutRef.current);
      }
      cursorHideTimeoutRef.current = setTimeout(() => {
        document.body.style.cursor = "none";
      }, 1400);
    };

    resetCursor();

    const handleMove = () => resetCursor();
    const handleKey = () => resetCursor();

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("keydown", handleKey);
      if (cursorHideTimeoutRef.current) {
        clearTimeout(cursorHideTimeoutRef.current);
      }
      document.body.style.cursor = "";
    };
  }, [isFullscreenMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === "KeyF" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!timerActive) {
          e.preventDefault();
          toggleFullscreen();
        }
        return;
      }

      if (e.code === "Escape") {
        e.preventDefault();

        if (showSplitEditor) {
          setShowSplitEditor(false);
          return;
        }

        if (isFullscreenMode) {
          toggleFullscreen();
          return;
        }

        return;
      }

      if (timerActive) {
        return;
      }

      if (
        e.code === "KeyE" &&
        !e.ctrlKey &&
        !e.metaKey &&
        state.settings.trainingModeEnabled
      ) {
        e.preventDefault();
        setShowSplitEditor((prev) => !prev);
        return;
      }

      if (e.code === "KeyI" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        updateSettings({
          inspectionEnabled: !state.settings.inspectionEnabled,
        });
        return;
      }

      if (e.code === "KeyT" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        updateSettings({
          trainingModeEnabled: !state.settings.trainingModeEnabled,
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    timerActive,
    showSplitEditor,
    isFullscreenMode,
    state.settings.inspectionEnabled,
    state.settings.trainingModeEnabled,
    updateSettings,
  ]);

  const handleImportCSTimer = useCallback(
    (data: Parameters<typeof importCSTimerData>[0]) => {
      const summary = importCSTimerData(data);
      timer.reset();
      setCurrentSplits([]);
      setLastSolveCapture(null);
      setSelectedSolveId(null);

      if (importNoticeTimeoutRef.current) {
        clearTimeout(importNoticeTimeoutRef.current);
      }

      const puzzleLabel = PUZZLE_LABELS[summary.puzzleId] ?? summary.puzzleId;
      const parts: string[] = [];
      if (summary.plus2 > 0) {
        parts.push(`${summary.plus2} +2`);
      }
      if (summary.dnfs > 0) {
        parts.push(`${summary.dnfs} DNF${summary.dnfs !== 1 ? "s" : ""}`);
      }
      parts.push(puzzleLabel);
      const message = `${summary.imported} solve${summary.imported !== 1 ? "s" : ""} imported${parts.length ? ` · ${parts.join(" · ")}` : ""}`;

      setImportNotice(message);
      importNoticeTimeoutRef.current = setTimeout(() => {
        setImportNotice(null);
      }, 3400);

      return summary;
    },
    [importCSTimerData, timer],
  );

  if (!state.initialized) {
    return <div style={styles.loading}>KubeTimr</div>;
  }

  const panelOpacity = timerActive ? 0.08 : 1;
  const panelPointerEvents = timerActive ? "none" : "auto";

  return (
    <div style={styles.app}>
      <div
        style={{
          ...styles.leftPanel,
          opacity: panelOpacity,
          pointerEvents: panelPointerEvents,
        }}
      >
        <SolveList
          solves={activeSolves}
          selectedSolveId={selectedSolveId}
          onSelectSolve={setSelectedSolveId}
          onPenaltyChange={updateSolvePenalty}
          onDelete={handleDeleteSolve}
          disabled={timerActive}
        />
      </div>

      <div style={styles.centerColumn}>
        <div
          style={{
            ...styles.scrambleArea,
            opacity: timerActive ? 0.05 : 1,
            pointerEvents: panelPointerEvents,
          }}
        >
          <ScrambleDisplay
            scramble={
              timerActive
                ? state.currentScramble
                : (selectedSolve?.scramble ?? state.currentScramble)
            }
            activePuzzleId={state.activePuzzleId}
            onPuzzleChange={handlePuzzleChange}
            onRefresh={refreshScramble}
            disabled={timerActive}
          />
        </div>

        <div style={styles.timerZone}>
          <TimerDisplay
            status={timer.status}
            displayTime={timer.displayTime}
            inspectionRemaining={timer.inspectionRemaining}
            penalty={timer.result?.penalty ?? Penalty.None}
            isHolding={timer.isHolding}
            isReady={timer.isReady}
            isPB={timer.status === "stopped" && isLatestPB}
          />

          {state.settings.trainingModeEnabled &&
            timer.status === "stopped" &&
            lastSolveCapture && (
              <div style={styles.splitBreakdownArea}>
                <SplitBreakdown
                  phases={state.settings.splitPhases}
                  capture={lastSolveCapture}
                  totalDurationMs={timer.result?.rawDurationMs ?? null}
                />
              </div>
            )}

          {state.settings.trainingModeEnabled &&
            state.settings.splitPhases.length > 0 &&
            timer.status === "running" && (
              <div style={styles.splitMarkersOverlay as React.CSSProperties}>
                <SplitMarkers
                  phases={state.settings.splitPhases}
                  currentSplits={currentSplits}
                  isRunning={timer.status === "running"}
                  elapsedMs={timer.displayTime}
                  onMarkSplit={handleMarkSplit}
                />
              </div>
            )}
        </div>
      </div>

      <div
        style={{
          ...styles.rightPanel,
          opacity: panelOpacity,
          pointerEvents: panelPointerEvents,
        }}
      >
        <div style={styles.statsSection} className="hide-scrollbar">
          <StatsPanel
            stats={stats ?? null}
            personalBests={stats?.personalBests ?? []}
            moXAo5Value={state.settings.moXAo5Value}
            onMoXAo5Change={(value) => updateSettings({ moXAo5Value: value })}
            solveCount={activeSolves.length}
            selectedSolveId={selectedSolveId}
          />
        </div>

        <div style={styles.settingsSection}>
          <Settings
            inspectionEnabled={state.settings.inspectionEnabled}
            onInspectionChange={(enabled) =>
              updateSettings({ inspectionEnabled: enabled })
            }
            trainingModeEnabled={state.settings.trainingModeEnabled}
            onTrainingModeChange={(enabled) =>
              updateSettings({ trainingModeEnabled: enabled })
            }
            hideTimeDuringSolve={state.settings.hideTimeDuringSolve}
            onHideTimeDuringSolveChange={(enabled) =>
              updateSettings({ hideTimeDuringSolve: enabled })
            }
            showMilliseconds={state.settings.showMilliseconds}
            onShowMillisecondsChange={(enabled) =>
              updateSettings({ showMilliseconds: enabled })
            }
            onImportCSTimer={handleImportCSTimer}
            disabled={timerActive}
          />

          {state.settings.trainingModeEnabled && (
            <button
              onClick={() => setShowSplitEditor(true)}
              style={styles.trainingButton}
              aria-label="Edit split phases"
            >
              <span>Edit Split Phases</span>
              <span style={styles.trainingButtonKey}>E</span>
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          ...styles.fullscreenHint,
          opacity: showFullscreenHint ? 1 : 0,
        }}
      >
        Press Esc or F to exit
      </div>

      {importNotice && (
        <div style={styles.importNotice as React.CSSProperties}>
          {importNotice}
        </div>
      )}

      {showSplitEditor && (
        <div
          style={styles.modalBackdrop as React.CSSProperties}
          onClick={() => setShowSplitEditor(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Split phase editor"
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <SplitEditor
              phases={state.settings.splitPhases}
              onChange={setSplitPhases}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
