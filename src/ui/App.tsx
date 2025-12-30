/**
 * Main App component for KubeTimr.
 * Three-column layout with solves list, timer, and stats/settings.
 */

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
import { Penalty, SplitCapture, SplitInstance, TimingResult } from "../types";

const styles = {
  app: {
    display: "grid",
    gridTemplateColumns: "var(--sidebar-width) 1fr var(--sidebar-width)",
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--color-void)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-ui)",
  } as React.CSSProperties,

  leftPanel: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--color-surface)",
    borderRight: "1px solid var(--color-border-subtle)",
    transition: "opacity var(--transition-normal)",
  } as React.CSSProperties,

  centerColumn: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    position: "relative",
  } as React.CSSProperties,

  scrambleArea: {
    flexShrink: 0,
    padding: "var(--space-4) var(--space-6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "90px",
    transition: "opacity var(--transition-normal)",
  } as React.CSSProperties,

  timerZone: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: "6vh",
    position: "relative",
    overflow: "hidden",
  } as React.CSSProperties,

  rightPanel: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    backgroundColor: "var(--color-surface)",
    borderLeft: "1px solid var(--color-border-subtle)",
    transition: "opacity var(--transition-normal)",
  } as React.CSSProperties,

  statsSection: {
    flex: 1,
    overflow: "auto",
    padding: "var(--space-3)",
    minHeight: 0,
  } as React.CSSProperties,

  settingsSection: {
    flexShrink: 0,
    padding: "var(--space-3)",
    borderTop: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  splitBreakdownArea: {
    width: "100%",
    maxWidth: "380px",
    padding: "var(--space-3)",
    marginTop: "var(--space-3)",
  } as React.CSSProperties,

  splitMarkersOverlay: {
    position: "absolute",
    right: "var(--space-4)",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
  } as React.CSSProperties,

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  modalContent: {
    maxWidth: "400px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
  } as React.CSSProperties,

  trainingButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-3)",
    marginTop: "var(--space-2)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-md)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    width: "100%",
  } as React.CSSProperties,

  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontSize: "var(--text-lg)",
    color: "var(--color-text-muted)",
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  } as React.CSSProperties,

  fullscreenHint: {
    position: "fixed",
    top: "var(--space-3)",
    right: "var(--space-3)",
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

  const fullscreenHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleSolveComplete = useCallback(
    (result: TimingResult) => {
      if (!state.currentScramble) return;

      const solve = addSolve(result, state.currentScramble);

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

  const timerActive =
    timer.status === "running" || timer.status === "inspection";

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

  if (!state.initialized) {
    return <div style={styles.loading}>KubeTimr</div>;
  }

  const panelOpacity = timerActive ? 0.12 : 1;
  const panelPointerEvents = timerActive ? "none" : "auto";

  return (
    <div style={styles.app}>
      {/* Left panel: Solves list */}
      <div
        style={{
          ...styles.leftPanel,
          opacity: panelOpacity,
          pointerEvents: panelPointerEvents,
        }}
      >
        <SolveList
          solves={activeSolves}
          onPenaltyChange={updateSolvePenalty}
          onDelete={deleteSolve}
          disabled={timerActive}
        />
      </div>

      {/* Center: Scramble + Timer */}
      <div style={styles.centerColumn}>
        <div
          style={{
            ...styles.scrambleArea,
            opacity: timerActive ? 0.08 : 1,
            pointerEvents: panelPointerEvents,
          }}
        >
          <ScrambleDisplay
            scramble={state.currentScramble}
            activePuzzleId={state.activePuzzleId}
            onPuzzleChange={setActivePuzzle}
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

      {/* Right panel: Stats + Settings */}
      <div
        style={{
          ...styles.rightPanel,
          opacity: panelOpacity,
          pointerEvents: panelPointerEvents,
        }}
      >
        <div style={styles.statsSection} className="hide-scrollbar">
          <StatsPanel
            stats={stats?.rolling ?? null}
            personalBests={stats?.personalBests ?? []}
            moXAo5Value={state.settings.moXAo5Value}
            onMoXAo5Change={(value) => updateSettings({ moXAo5Value: value })}
            solveCount={activeSolves.length}
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
            onImportCSTimer={importCSTimerData}
            disabled={timerActive}
          />

          {state.settings.trainingModeEnabled && (
            <button
              onClick={() => setShowSplitEditor(true)}
              style={styles.trainingButton}
              aria-label="Edit split phases"
            >
              <span>Edit Split Phases</span>
              <span className="kbd">E</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen hint */}
      <div
        style={{
          ...styles.fullscreenHint,
          opacity: showFullscreenHint ? 1 : 0,
        }}
      >
        Press <span className="kbd">Esc</span> or <span className="kbd">F</span>{" "}
        to exit
      </div>

      {/* Split editor modal */}
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
