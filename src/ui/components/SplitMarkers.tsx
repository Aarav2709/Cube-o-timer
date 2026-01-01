import React, { useCallback, useEffect, useMemo } from "react";
import { DurationMs, SplitInstance, SplitPhaseDefinition } from "../../types";

export interface SplitMarkersProps {
  phases: SplitPhaseDefinition[];
  currentSplits: SplitInstance[];
  isRunning: boolean;
  elapsedMs: DurationMs;
  onMarkSplit: (phase: string, timestampMs: DurationMs) => void;
  disabled?: boolean;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    padding: "6px",
    backgroundColor: "var(--color-surface)",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    minWidth: "100px",
    userSelect: "none",
    WebkitUserSelect: "none",
  } as React.CSSProperties,

  header: {
    fontSize: "9px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "2px",
  } as React.CSSProperties,

  phaseRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 4px",
    borderRadius: "2px",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid",
    borderLeftColor: "transparent",
    transition: "all 40ms ease-out",
    cursor: "pointer",
  } as React.CSSProperties,

  phaseRowCurrent: {
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    borderLeftColor: "var(--color-ready)",
  } as React.CSSProperties,

  phaseRowMarked: {
    backgroundColor: "var(--color-surface-raised)",
  } as React.CSSProperties,

  phaseInfo: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  phaseKey: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    color: "var(--color-text-disabled)",
    minWidth: "8px",
  } as React.CSSProperties,

  phaseName: {
    fontSize: "10px",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,

  phaseNameCurrent: {
    fontWeight: 600,
    color: "var(--color-ready)",
  } as React.CSSProperties,

  phaseNameMarked: {
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  phaseTime: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-muted)",
    minWidth: "28px",
    textAlign: "right",
  } as React.CSSProperties,

  phaseTimeMarked: {
    color: "var(--color-ready)",
  } as React.CSSProperties,

  hint: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
    marginTop: "2px",
    textAlign: "center",
  } as React.CSSProperties,

  complete: {
    color: "var(--color-ready)",
  } as React.CSSProperties,

  kbd: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "10px",
    padding: "0 2px",
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    fontWeight: 500,
    lineHeight: 1.3,
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface-raised)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "2px",
  } as React.CSSProperties,
};

function formatTime(ms: DurationMs): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${seconds}.${centis.toString().padStart(2, "0")}`;
}

export function SplitMarkers({
  phases,
  currentSplits,
  isRunning,
  elapsedMs,
  onMarkSplit,
  disabled = false,
}: SplitMarkersProps) {
  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.order - b.order),
    [phases],
  );

  const currentPhaseIndex = useMemo(() => {
    const markedPhases = new Set(currentSplits.map((s) => s.phase));
    const nextIndex = sortedPhases.findIndex((p) => !markedPhases.has(p.name));
    return nextIndex === -1 ? sortedPhases.length : nextIndex;
  }, [sortedPhases, currentSplits]);

  const getSplitTime = useCallback(
    (phaseName: string): DurationMs | null => {
      const split = currentSplits.find((s) => s.phase === phaseName);
      return split?.timestampMs ?? null;
    },
    [currentSplits],
  );

  const handleMarkCurrent = useCallback(() => {
    if (disabled || !isRunning) return;
    if (currentPhaseIndex >= sortedPhases.length) return;
    const currentPhase = sortedPhases[currentPhaseIndex];
    if (currentPhase) {
      onMarkSplit(currentPhase.name, elapsedMs);
    }
  }, [
    disabled,
    isRunning,
    currentPhaseIndex,
    sortedPhases,
    elapsedMs,
    onMarkSplit,
  ]);

  const handleMarkPhase = useCallback(
    (index: number) => {
      if (disabled || !isRunning) return;
      if (index < 0 || index >= sortedPhases.length) return;
      const phase = sortedPhases[index];
      if (phase) {
        onMarkSplit(phase.name, elapsedMs);
      }
    },
    [disabled, isRunning, sortedPhases, elapsedMs, onMarkSplit],
  );

  useEffect(() => {
    if (!isRunning || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          handleMarkPhase(num - 1);
          return;
        }
      }

      if (
        e.code === "KeyS" ||
        e.code === "Enter" ||
        e.code === "Tab" ||
        e.code === "ShiftLeft" ||
        e.code === "ShiftRight"
      ) {
        e.preventDefault();
        handleMarkCurrent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, disabled, handleMarkCurrent, handleMarkPhase]);

  if (sortedPhases.length === 0) {
    return null;
  }

  const allMarked = currentPhaseIndex >= sortedPhases.length;

  return (
    <div style={styles.container}>
      <div style={styles.header as React.CSSProperties}>Splits</div>
      {sortedPhases.map((phase, index) => {
        const splitTime = getSplitTime(phase.name);
        const isMarked = splitTime !== null;
        const isCurrent = index === currentPhaseIndex && isRunning;

        return (
          <div
            key={phase.name}
            style={{
              ...styles.phaseRow,
              ...(isCurrent ? styles.phaseRowCurrent : {}),
              ...(isMarked && !isCurrent ? styles.phaseRowMarked : {}),
            }}
            onClick={() => {
              if (isRunning && !disabled) {
                handleMarkPhase(index);
              }
            }}
          >
            <div style={styles.phaseInfo}>
              <span style={styles.phaseKey}>{index + 1}</span>
              <span
                style={{
                  ...styles.phaseName,
                  ...(isCurrent ? styles.phaseNameCurrent : {}),
                  ...(isMarked && !isCurrent ? styles.phaseNameMarked : {}),
                }}
              >
                {phase.name}
              </span>
            </div>
            <span
              style={{
                ...styles.phaseTime,
                ...(isMarked ? styles.phaseTimeMarked : {}),
              }}
            >
              {isMarked ? formatTime(splitTime!) : "—"}
            </span>
          </div>
        );
      })}
      {isRunning && !allMarked && (
        <div style={styles.hint as React.CSSProperties}>
          <span style={styles.kbd}>S</span> or <span style={styles.kbd}>1</span>
          -<span style={styles.kbd}>{sortedPhases.length}</span>
        </div>
      )}
      {allMarked && (
        <div
          style={{ ...styles.hint, ...styles.complete } as React.CSSProperties}
        >
          ✓ Done
        </div>
      )}
    </div>
  );
}

export default SplitMarkers;
