/**
 * SplitMarkers: Lightweight split capture overlay during active solves.
 */

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
    gap: "var(--space-0)",
    padding: "var(--space-2)",
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border)",
    minWidth: "120px",
    userSelect: "none",
    WebkitUserSelect: "none",
  } as React.CSSProperties,

  header: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "var(--space-0)",
  } as React.CSSProperties,

  phaseRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px var(--space-1)",
    borderRadius: "var(--border-radius-sm)",
    borderLeft: "2px solid transparent",
    transition: "all var(--transition-fast)",
    cursor: "pointer",
  } as React.CSSProperties,

  phaseRowCurrent: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderLeftColor: "var(--color-ready)",
  } as React.CSSProperties,

  phaseRowMarked: {
    backgroundColor: "var(--color-surface-raised)",
  } as React.CSSProperties,

  phaseInfo: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
  } as React.CSSProperties,

  phaseKey: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-disabled)",
    minWidth: "10px",
  } as React.CSSProperties,

  phaseName: {
    fontSize: "var(--text-xs)",
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
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-muted)",
    minWidth: "32px",
    textAlign: "right",
  } as React.CSSProperties,

  phaseTimeMarked: {
    color: "var(--color-ready)",
  } as React.CSSProperties,

  hint: {
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
    marginTop: "var(--space-1)",
    textAlign: "center",
  } as React.CSSProperties,

  complete: {
    color: "var(--color-ready)",
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
  // Sort phases by order
  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.order - b.order),
    [phases],
  );

  // Determine current phase index (next unmarked phase)
  const currentPhaseIndex = useMemo(() => {
    const markedPhases = new Set(currentSplits.map((s) => s.phase));
    const nextIndex = sortedPhases.findIndex((p) => !markedPhases.has(p.name));
    return nextIndex === -1 ? sortedPhases.length : nextIndex;
  }, [sortedPhases, currentSplits]);

  // Get split time for a phase
  const getSplitTime = useCallback(
    (phaseName: string): DurationMs | null => {
      const split = currentSplits.find((s) => s.phase === phaseName);
      return split?.timestampMs ?? null;
    },
    [currentSplits],
  );

  // Handle marking current split
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

  // Handle marking specific phase by number
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

  // Keyboard handler
  useEffect(() => {
    if (!isRunning || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore Space (used for timer)
      if (e.code === "Space") return;

      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Number keys 1-9 for specific phases
      if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          handleMarkPhase(num - 1);
          return;
        }
      }

      // Common keys for marking current phase
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

  // Don't render if no phases defined
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
            role="button"
            tabIndex={-1}
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
          <span className="kbd">S</span> or <span className="kbd">1</span>-
          <span className="kbd">{sortedPhases.length}</span>
        </div>
      )}

      {allMarked && (
        <div
          style={{ ...styles.hint, ...styles.complete } as React.CSSProperties}
        >
          ✓ All phases marked
        </div>
      )}
    </div>
  );
}

export default SplitMarkers;
