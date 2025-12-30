/**
 * ScrambleDisplay: Scramble sequence with puzzle selector and refresh control.
 */

import React, { useCallback, useEffect, useState } from "react";
import { PuzzleId, Scramble, WcaEventId } from "../../types";

export interface ScrambleDisplayProps {
  scramble: Scramble | null;
  activePuzzleId: PuzzleId;
  onPuzzleChange: (puzzleId: PuzzleId) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

const PUZZLE_LABELS: Record<WcaEventId, string> = {
  "222": "2×2",
  "333": "3×3",
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

const PUZZLE_ORDER: WcaEventId[] = [
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

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-3)",
    width: "100%",
    maxWidth: "680px",
  } as React.CSSProperties,

  controls: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
  } as React.CSSProperties,

  selectWrapper: {
    position: "relative",
  } as React.CSSProperties,

  select: {
    padding: "var(--space-1) var(--space-3)",
    paddingRight: "28px",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-ui)",
    fontWeight: 500,
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-md)",
    cursor: "pointer",
    outline: "none",
    transition: "all var(--transition-fast)",
    minWidth: "90px",
  } as React.CSSProperties,

  selectHover: {
    borderColor: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface)",
  } as React.CSSProperties,

  refreshButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    padding: 0,
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-md)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  } as React.CSSProperties,

  refreshButtonHover: {
    borderColor: "var(--color-text-muted)",
    color: "var(--color-text-primary)",
    backgroundColor: "var(--color-surface)",
  } as React.CSSProperties,

  refreshButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as React.CSSProperties,

  scrambleContainer: {
    width: "100%",
    textAlign: "center",
  } as React.CSSProperties,

  scrambleText: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--scramble-font-size)",
    fontWeight: "var(--scramble-font-weight)",
    color: "var(--color-text-primary)",
    lineHeight: "var(--scramble-line-height)",
    letterSpacing: "var(--scramble-letter-spacing)",
    wordBreak: "break-word",
    hyphens: "none",
    /* Balanced text wrapping for better line breaks */
    textWrap: "balance",
  } as React.CSSProperties,

  scrambleTextMultiLine: {
    whiteSpace: "pre-wrap",
    fontSize: "var(--text-sm)",
    lineHeight: 1.7,
  } as React.CSSProperties,

  scrambleLoading: {
    opacity: 0.35,
  } as React.CSSProperties,

  hint: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
    marginTop: "var(--space-1)",
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,
};

export function ScrambleDisplay({
  scramble,
  activePuzzleId,
  onPuzzleChange,
  onRefresh,
  disabled = false,
}: ScrambleDisplayProps) {
  const [selectHovered, setSelectHovered] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "KeyR" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onRefresh();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRefresh, disabled]);

  const handlePuzzleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPuzzleChange(e.target.value as PuzzleId);
    },
    [onPuzzleChange],
  );

  const handleRefreshClick = useCallback(() => {
    if (!disabled) {
      onRefresh();
    }
  }, [onRefresh, disabled]);

  const isMultiLine = scramble?.notation.includes("\n") ?? false;

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <div style={styles.selectWrapper as React.CSSProperties}>
          <select
            value={activePuzzleId}
            onChange={handlePuzzleChange}
            onMouseEnter={() => setSelectHovered(true)}
            onMouseLeave={() => setSelectHovered(false)}
            onFocus={() => setSelectHovered(true)}
            onBlur={() => setSelectHovered(false)}
            style={{
              ...styles.select,
              ...(selectHovered && !disabled ? styles.selectHover : {}),
              ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
            }}
            disabled={disabled}
            aria-label="Select puzzle type"
          >
            {PUZZLE_ORDER.map((id) => (
              <option key={id} value={id}>
                {PUZZLE_LABELS[id]}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleRefreshClick}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          onFocus={() => setButtonHovered(true)}
          onBlur={() => setButtonHovered(false)}
          style={{
            ...styles.refreshButton,
            ...(buttonHovered && !disabled ? styles.refreshButtonHover : {}),
            ...(disabled ? styles.refreshButtonDisabled : {}),
          }}
          disabled={disabled}
          aria-label="Generate new scramble"
          title="New scramble (R)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </button>
      </div>

      <div style={styles.scrambleContainer as React.CSSProperties}>
        {scramble ? (
          <div
            style={{
              ...styles.scrambleText,
              ...(isMultiLine ? styles.scrambleTextMultiLine : {}),
            }}
            role="region"
            aria-label="Scramble sequence"
            aria-live="polite"
          >
            {scramble.notation}
          </div>
        ) : (
          <div
            style={{
              ...styles.scrambleText,
              ...styles.scrambleLoading,
            }}
          >
            Loading scramble...
          </div>
        )}

        <div style={styles.hint}>
          <span className="kbd">R</span>
          <span>new scramble</span>
        </div>
      </div>
    </div>
  );
}

export default ScrambleDisplay;
