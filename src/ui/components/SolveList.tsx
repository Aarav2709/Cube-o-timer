/**
 * SolveList: Chronological list of solves optimized for high-density viewing.
 * Keyboard navigation with vim-style shortcuts (J/K, arrows).
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { DurationMs, Penalty, Solve, SolveId } from "../../types";

export interface SolveListProps {
  solves: Solve[];
  onPenaltyChange: (solveId: SolveId, penalty: Penalty) => void;
  onDelete: (solveId: SolveId) => void;
  disabled?: boolean;
}

function formatTime(ms: DurationMs | null): string {
  if (ms === null) return "DNF";
  if (ms < 0) ms = 0;

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    const secStr = seconds.toString().padStart(2, "0");
    return `${minutes}:${secStr}.${centis.toString().padStart(2, "0")}`;
  }

  return `${seconds}.${centis.toString().padStart(2, "0")}`;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  } as React.CSSProperties,

  header: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-2) var(--space-3)",
    borderBottom: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  headerTitle: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  } as React.CSSProperties,

  headerCount: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500,
  } as React.CSSProperties,

  listContainer: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "var(--space-1) 0",
  } as React.CSSProperties,

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--color-text-muted)",
    fontSize: "var(--text-sm)",
    gap: "var(--space-2)",
    padding: "var(--space-6)",
    textAlign: "center",
  } as React.CSSProperties,

  footer: {
    flexShrink: 0,
    display: "flex",
    gap: "var(--space-3)",
    flexWrap: "wrap",
    padding: "var(--space-2) var(--space-3)",
    borderTop: "1px solid var(--color-border-subtle)",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  footerHint: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
  } as React.CSSProperties,

  row: {
    display: "flex",
    alignItems: "center",
    padding: "3px var(--space-3) 3px var(--space-2)",
    cursor: "pointer",
    position: "relative",
    transition: "background-color var(--transition-fast)",
    borderLeft: "2px solid transparent",
    minHeight: "24px",
  } as React.CSSProperties,

  rowSelected: {
    borderLeftColor: "var(--color-focus)",
    backgroundColor: "rgba(96, 165, 250, 0.06)",
  } as React.CSSProperties,

  rowHover: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  } as React.CSSProperties,

  rowIndex: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-disabled)",
    minWidth: "24px",
    marginRight: "var(--space-1)",
    fontVariantNumeric: "tabular-nums",
    opacity: 0.7,
  } as React.CSSProperties,

  rowTime: {
    flex: 1,
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  rowTimeDnf: {
    color: "var(--color-error-muted)",
  } as React.CSSProperties,

  rowTimePlus2: {
    color: "var(--color-warn-muted)",
  } as React.CSSProperties,

  rowPenaltyBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    fontWeight: 600,
    marginLeft: "var(--space-1)",
    padding: "1px 3px",
    borderRadius: "2px",
    textTransform: "uppercase",
  } as React.CSSProperties,

  penaltyPlus2: {
    color: "var(--color-warn)",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  } as React.CSSProperties,

  penaltyDnf: {
    color: "var(--color-error)",
    backgroundColor: "rgba(248, 113, 113, 0.12)",
  } as React.CSSProperties,

  rowActions: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    opacity: 0,
    transition: "opacity var(--transition-fast)",
  } as React.CSSProperties,

  rowActionsVisible: {
    opacity: 1,
  } as React.CSSProperties,

  actionButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 5px",
    fontSize: "10px",
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "var(--color-text-muted)",
    backgroundColor: "transparent",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-sm)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    minWidth: "26px",
  } as React.CSSProperties,

  actionButtonHover: {
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,

  actionButtonActive: {
    borderColor: "currentColor",
  } as React.CSSProperties,

  actionButtonDelete: {
    marginLeft: "var(--space-1)",
  } as React.CSSProperties,

  actionButtonDeleteConfirm: {
    color: "var(--color-error)",
    borderColor: "var(--color-error)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  } as React.CSSProperties,
};

interface SolveRowProps {
  solve: Solve;
  index: number;
  isSelected: boolean;
  onSelect: (id: SolveId) => void;
  onPenaltyChange: (solveId: SolveId, penalty: Penalty) => void;
  onDelete: (solveId: SolveId) => void;
  disabled?: boolean;
}

function SolveRow({
  solve,
  index,
  isSelected,
  onSelect,
  onPenaltyChange,
  onDelete,
  disabled = false,
}: SolveRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  /* Scroll into view when selected */
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  /* Reset confirm state after timeout */
  useEffect(() => {
    if (confirmDelete) {
      const timeout = setTimeout(() => setConfirmDelete(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [confirmDelete]);

  const handleRowClick = useCallback(() => {
    onSelect(solve.id);
  }, [solve.id, onSelect]);

  const handlePenaltyClick = useCallback(
    (e: React.MouseEvent, penalty: Penalty) => {
      e.stopPropagation();
      if (disabled) return;
      /* Toggle penalty */
      const newPenalty =
        solve.timing.penalty === penalty ? Penalty.None : penalty;
      onPenaltyChange(solve.id, newPenalty);
    },
    [solve.id, solve.timing.penalty, onPenaltyChange, disabled],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;

      if (confirmDelete) {
        onDelete(solve.id);
        setConfirmDelete(false);
      } else {
        setConfirmDelete(true);
      }
    },
    [solve.id, onDelete, confirmDelete, disabled],
  );

  const showActions = isSelected || isHovered;
  const isPlus2 = solve.timing.penalty === Penalty.Plus2;
  const isDnf = solve.timing.penalty === Penalty.DNF;

  return (
    <div
      ref={rowRef}
      style={{
        ...styles.row,
        ...(isSelected ? styles.rowSelected : {}),
        ...(isHovered && !isSelected ? styles.rowHover : {}),
      }}
      onClick={handleRowClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setConfirmDelete(false);
        setHoveredButton(null);
      }}
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
    >
      {/* Index number */}
      <span style={styles.rowIndex}>{index + 1}</span>

      {/* Time */}
      <span
        style={{
          ...styles.rowTime,
          ...(isDnf ? styles.rowTimeDnf : {}),
          ...(isPlus2 ? styles.rowTimePlus2 : {}),
        }}
      >
        {formatTime(solve.timing.finalDurationMs)}
      </span>

      {/* Penalty badge (always visible when present) */}
      {isPlus2 && (
        <span style={{ ...styles.rowPenaltyBadge, ...styles.penaltyPlus2 }}>
          +2
        </span>
      )}
      {isDnf && (
        <span style={{ ...styles.rowPenaltyBadge, ...styles.penaltyDnf }}>
          DNF
        </span>
      )}

      {/* Actions (visible on hover/select) */}
      <div
        style={{
          ...styles.rowActions,
          ...(showActions ? styles.rowActionsVisible : {}),
        }}
      >
        <button
          style={{
            ...styles.actionButton,
            ...(hoveredButton === "plus2" ? styles.actionButtonHover : {}),
            ...(isPlus2
              ? { ...styles.actionButtonActive, color: "var(--color-warn)" }
              : {}),
          }}
          onClick={(e) => handlePenaltyClick(e, Penalty.Plus2)}
          onMouseEnter={() => setHoveredButton("plus2")}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={disabled}
          title="Toggle +2 penalty (2)"
          aria-label="Toggle +2 penalty"
        >
          +2
        </button>
        <button
          style={{
            ...styles.actionButton,
            ...(hoveredButton === "dnf" ? styles.actionButtonHover : {}),
            ...(isDnf
              ? { ...styles.actionButtonActive, color: "var(--color-error)" }
              : {}),
          }}
          onClick={(e) => handlePenaltyClick(e, Penalty.DNF)}
          onMouseEnter={() => setHoveredButton("dnf")}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={disabled}
          title="Toggle DNF penalty (D)"
          aria-label="Toggle DNF penalty"
        >
          DNF
        </button>
        <button
          style={{
            ...styles.actionButton,
            ...styles.actionButtonDelete,
            ...(hoveredButton === "delete" ? styles.actionButtonHover : {}),
            ...(confirmDelete ? styles.actionButtonDeleteConfirm : {}),
          }}
          onClick={handleDeleteClick}
          onMouseEnter={() => setHoveredButton("delete")}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={disabled}
          title={
            confirmDelete ? "Click again to confirm" : "Delete solve (Del)"
          }
          aria-label={confirmDelete ? "Confirm delete" : "Delete solve"}
        >
          {confirmDelete ? "?" : "×"}
        </button>
      </div>
    </div>
  );
}

export function SolveList({
  solves,
  onPenaltyChange,
  onDelete,
  disabled = false,
}: SolveListProps) {
  const [selectedId, setSelectedId] = useState<SolveId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Reverse solves to show most recent first */
  const reversedSolves = useMemo(() => [...solves].reverse(), [solves]);

  /* Auto-select most recent solve when list changes */
  useEffect(() => {
    if (reversedSolves.length > 0) {
      /* Only auto-select if nothing is selected or selection is gone */
      if (!selectedId || !solves.find((s) => s.id === selectedId)) {
        const firstSolve = reversedSolves[0];
        if (firstSolve) {
          setSelectedId(firstSolve.id);
        }
      }
    } else {
      setSelectedId(null);
    }
  }, [reversedSolves, selectedId, solves]);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      /* Don't handle if typing in input */
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentIndex = reversedSolves.findIndex((s) => s.id === selectedId);

      switch (e.code) {
        case "ArrowUp":
        case "KeyK": {
          e.preventDefault();
          if (currentIndex > 0) {
            const prevSolve = reversedSolves[currentIndex - 1];
            if (prevSolve) {
              setSelectedId(prevSolve.id);
            }
          }
          break;
        }

        case "ArrowDown":
        case "KeyJ": {
          e.preventDefault();
          if (currentIndex < reversedSolves.length - 1) {
            const nextSolve = reversedSolves[currentIndex + 1];
            if (nextSolve) {
              setSelectedId(nextSolve.id);
            }
          }
          break;
        }

        case "Digit2":
        case "Numpad2": {
          if (selectedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const solve = solves.find((s) => s.id === selectedId);
            if (solve) {
              const newPenalty =
                solve.timing.penalty === Penalty.Plus2
                  ? Penalty.None
                  : Penalty.Plus2;
              onPenaltyChange(selectedId, newPenalty);
            }
          }
          break;
        }

        case "KeyD": {
          if (selectedId && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const solve = solves.find((s) => s.id === selectedId);
            if (solve) {
              const newPenalty =
                solve.timing.penalty === Penalty.DNF
                  ? Penalty.None
                  : Penalty.DNF;
              onPenaltyChange(selectedId, newPenalty);
            }
          }
          break;
        }

        case "Digit0":
        case "Numpad0": {
          if (selectedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onPenaltyChange(selectedId, Penalty.None);
          }
          break;
        }

        case "Delete":
        case "Backspace": {
          if (selectedId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onDelete(selectedId);
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, reversedSolves, solves, onPenaltyChange, onDelete, disabled]);

  const handleSelect = useCallback((id: SolveId) => {
    setSelectedId(id);
  }, []);

  return (
    <div
      ref={containerRef}
      style={styles.container}
      role="grid"
      tabIndex={0}
      aria-label="Solve list"
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle as React.CSSProperties}>Solves</span>
        <span style={styles.headerCount}>{solves.length}</span>
      </div>

      {/* List */}
      <div
        style={styles.listContainer}
        className="hide-scrollbar"
        role="rowgroup"
      >
        {reversedSolves.length === 0 ? (
          <div style={styles.emptyState as React.CSSProperties}>
            <span>No solves yet.</span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-disabled)",
              }}
            >
              Hold space to start timing.
            </span>
          </div>
        ) : (
          reversedSolves.map((solve, idx) => (
            <SolveRow
              key={solve.id}
              solve={solve}
              index={solves.length - 1 - idx}
              isSelected={solve.id === selectedId}
              onSelect={handleSelect}
              onPenaltyChange={onPenaltyChange}
              onDelete={onDelete}
              disabled={disabled}
            />
          ))
        )}
      </div>

      {/* Footer with keyboard hints */}
      {reversedSolves.length > 0 && (
        <div style={styles.footer}>
          <span style={styles.footerHint}>
            <span className="kbd">↑↓</span>
          </span>
          <span style={styles.footerHint}>
            <span className="kbd">2</span>
            <span>+2</span>
          </span>
          <span style={styles.footerHint}>
            <span className="kbd">D</span>
            <span>DNF</span>
          </span>
          <span style={styles.footerHint}>
            <span className="kbd">Del</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default SolveList;
