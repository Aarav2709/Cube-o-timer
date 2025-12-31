import React, { useCallback, useEffect, useState, useRef } from "react";
import { CSTimerImportData, PuzzleId, WcaEventId } from "../../types";

interface SettingsProps {
  inspectionEnabled: boolean;
  onInspectionChange: (enabled: boolean) => void;
  trainingModeEnabled: boolean;
  onTrainingModeChange: (enabled: boolean) => void;
  hideTimeDuringSolve: boolean;
  onHideTimeDuringSolveChange: (enabled: boolean) => void;
  showMilliseconds: boolean;
  onShowMillisecondsChange: (enabled: boolean) => void;
  onImportCSTimer?: (data: CSTimerImportData) => {
    imported: number;
    dnfs: number;
    plus2: number;
    puzzleId: PuzzleId;
  };
  disabled?: boolean;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  } as React.CSSProperties,

  sectionHeader: {
    fontSize: "9px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginTop: "10px",
    marginBottom: "4px",
    paddingLeft: "2px",
  } as React.CSSProperties,

  firstSectionHeader: {
    marginTop: "0",
  } as React.CSSProperties,

  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 4px",
    borderRadius: "3px",
    transition: "background-color 40ms ease-out",
  } as React.CSSProperties,

  toggleRowHover: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  } as React.CSSProperties,

  labelContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    flex: 1,
    marginRight: "8px",
  } as React.CSSProperties,

  label: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  description: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
    lineHeight: 1.3,
  } as React.CSSProperties,

  toggleContainer: {
    position: "relative",
    width: "28px",
    height: "16px",
    flexShrink: 0,
  } as React.CSSProperties,

  toggleInput: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    height: "100%",
    cursor: "pointer",
    margin: 0,
    zIndex: 1,
  } as React.CSSProperties,

  toggleInputDisabled: {
    cursor: "not-allowed",
  } as React.CSSProperties,

  toggleTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "8px",
    transition: "background-color 80ms ease-out",
  } as React.CSSProperties,

  toggleTrackOff: {
    backgroundColor: "var(--color-border)",
  } as React.CSSProperties,

  toggleTrackOn: {
    backgroundColor: "rgba(74, 222, 128, 0.25)",
  } as React.CSSProperties,

  toggleTrackDisabled: {
    opacity: 0.4,
  } as React.CSSProperties,

  toggleThumb: {
    position: "absolute",
    top: "2px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    transition: "left 80ms ease-out, background-color 80ms ease-out",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
  } as React.CSSProperties,

  toggleThumbOff: {
    left: "2px",
    backgroundColor: "var(--color-text-muted)",
  } as React.CSSProperties,

  toggleThumbOn: {
    left: "14px",
    backgroundColor: "var(--color-ready)",
  } as React.CSSProperties,

  kbd: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "14px",
    padding: "1px 4px",
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    fontWeight: 500,
    lineHeight: 1.2,
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "2px",
  } as React.CSSProperties,

  selectRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "5px 4px",
    borderRadius: "3px",
  } as React.CSSProperties,

  selectLabel: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  select: {
    padding: "3px 20px 3px 6px",
    fontSize: "10px",
    fontFamily: "var(--font-ui)",
    fontWeight: 500,
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "3px",
    cursor: "pointer",
    minWidth: "80px",
    appearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 5px center",
  } as React.CSSProperties,

  segmentedControl: {
    display: "flex",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "4px",
    overflow: "hidden",
  } as React.CSSProperties,

  segmentButton: {
    flex: 1,
    padding: "4px 8px",
    fontSize: "9px",
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    color: "var(--color-text-muted)",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 40ms ease-out",
    borderRight: "1px solid var(--color-border)",
  } as React.CSSProperties,

  segmentButtonLast: {
    borderRight: "none",
  } as React.CSSProperties,

  segmentButtonActive: {
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    color: "var(--color-focus)",
  } as React.CSSProperties,

  divider: {
    height: "1px",
    backgroundColor: "var(--color-border-subtle)",
    margin: "8px 0",
  } as React.CSSProperties,

  importSection: {
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  importZone: {
    padding: "10px 8px",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "var(--color-border)",
    borderRadius: "4px",
    backgroundColor: "transparent",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 60ms ease-out",
  } as React.CSSProperties,

  importZoneHover: {
    borderColor: "var(--color-text-muted)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  } as React.CSSProperties,

  importZoneActive: {
    borderColor: "var(--color-focus)",
    backgroundColor: "rgba(96, 165, 250, 0.04)",
    borderStyle: "solid",
  } as React.CSSProperties,

  importZoneDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  } as React.CSSProperties,

  importText: {
    fontSize: "10px",
    color: "var(--color-text-secondary)",
    marginBottom: "2px",
  } as React.CSSProperties,

  importHint: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  importFeedback: {
    marginTop: "6px",
    padding: "6px 8px",
    borderRadius: "3px",
    fontSize: "10px",
  } as React.CSSProperties,

  importSuccess: {
    color: "var(--color-ready)",
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    border: "1px solid rgba(74, 222, 128, 0.2)",
  } as React.CSSProperties,

  importError: {
    color: "var(--color-error)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
  } as React.CSSProperties,

  importDetails: {
    marginTop: "2px",
    fontSize: "9px",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  hiddenInput: {
    display: "none",
  } as React.CSSProperties,

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  modal: {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    padding: "20px",
    minWidth: "280px",
    maxWidth: "340px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
  } as React.CSSProperties,

  modalTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    marginBottom: "4px",
  } as React.CSSProperties,

  modalSubtitle: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
    marginBottom: "16px",
  } as React.CSSProperties,

  puzzleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "6px",
    marginBottom: "16px",
  } as React.CSSProperties,

  puzzleButton: {
    padding: "10px 8px",
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    backgroundColor: "var(--color-surface-raised)",
    border: "1px solid var(--color-border)",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 40ms ease-out",
    textAlign: "center",
  } as React.CSSProperties,

  puzzleButtonHover: {
    borderColor: "var(--color-text-muted)",
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  puzzleButtonSelected: {
    borderColor: "var(--color-focus)",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    color: "var(--color-focus)",
  } as React.CSSProperties,

  modalActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  } as React.CSSProperties,

  modalButton: {
    padding: "7px 14px",
    fontSize: "11px",
    fontWeight: 500,
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 40ms ease-out",
  } as React.CSSProperties,

  modalButtonCancel: {
    color: "var(--color-text-muted)",
    backgroundColor: "transparent",
    border: "1px solid var(--color-border)",
  } as React.CSSProperties,

  modalButtonConfirm: {
    color: "var(--color-void)",
    backgroundColor: "var(--color-focus)",
    border: "1px solid var(--color-focus)",
  } as React.CSSProperties,

  fileInfo: {
    padding: "8px",
    backgroundColor: "var(--color-surface-raised)",
    borderRadius: "4px",
    marginBottom: "12px",
  } as React.CSSProperties,

  fileName: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--color-text-primary)",
    marginBottom: "2px",
    wordBreak: "break-all",
  } as React.CSSProperties,

  fileSize: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,
};

const PUZZLE_OPTIONS: { id: WcaEventId; label: string }[] = [
  { id: "333", label: "3×3" },
  { id: "222", label: "2×2" },
  { id: "444", label: "4×4" },
  { id: "555", label: "5×5" },
  { id: "666", label: "6×6" },
  { id: "777", label: "7×7" },
  { id: "pyram", label: "Pyra" },
  { id: "skewb", label: "Skewb" },
  { id: "sq1", label: "SQ-1" },
  { id: "clock", label: "Clock" },
  { id: "minx", label: "Mega" },
];

const PUZZLE_LABELS: Record<string, string> = Object.fromEntries(
  PUZZLE_OPTIONS.map((p) => [p.id, p.label]),
);

function resolvePuzzleLabel(puzzleId: PuzzleId): string {
  const normalized = puzzleId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return PUZZLE_LABELS[normalized] || PUZZLE_LABELS[puzzleId] || puzzleId;
}

interface ParseResult {
  solves: {
    time: number;
    penalty: "none" | "+2" | "DNF";
    scramble?: string;
    date?: string;
  }[];
  detectedPuzzle?: string;
}

function detectPuzzleType(text: string): string | undefined {
  const patterns: Record<string, RegExp> = {
    "222": /2x2|2×2/i,
    "333": /3x3|3×3/i,
    "444": /4x4|4×4/i,
    "555": /5x5|5×5/i,
    "666": /6x6|6×6/i,
    "777": /7x7|7×7/i,
    pyram: /pyra|pyraminx/i,
    skewb: /skewb/i,
    sq1: /sq.?1|square/i,
    clock: /clock/i,
    minx: /mega|minx/i,
  };
  for (const [puzzle, regex] of Object.entries(patterns)) {
    if (regex.test(text)) return puzzle;
  }
  return undefined;
}

function parseTimeString(str: string): number | null {
  const minSecMatch = str.match(/^(\d+):(\d+)\.?(\d*)$/);
  if (minSecMatch) {
    const minutes = parseInt(minSecMatch[1]!, 10);
    const seconds = parseInt(minSecMatch[2]!, 10);
    const fraction = minSecMatch[3] || "0";
    const centis =
      fraction.length === 3
        ? parseInt(fraction, 10)
        : fraction.length === 2
          ? parseInt(fraction, 10) * 10
          : fraction.length === 1
            ? parseInt(fraction, 10) * 100
            : 0;
    return (minutes * 60 + seconds) * 1000 + centis;
  }

  const secMatch = str.match(/^(\d+)\.(\d+)$/);
  if (secMatch) {
    const seconds = parseInt(secMatch[1]!, 10);
    const fraction = secMatch[2]!;
    const centis =
      fraction.length === 3
        ? parseInt(fraction, 10)
        : fraction.length === 2
          ? parseInt(fraction, 10) * 10
          : fraction.length === 1
            ? parseInt(fraction, 10) * 100
            : 0;
    return seconds * 1000 + centis;
  }

  const intMatch = str.match(/^(\d+)$/);
  if (intMatch) {
    return parseInt(intMatch[1]!, 10);
  }

  return null;
}

function parseCSTimerJson(text: string): ParseResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { solves: [], detectedPuzzle: undefined };
  }

  const solves: ParseResult["solves"] = [];
  let puzzle: string | undefined;

  const sessionEntries = Object.entries(data).filter(
    ([key]) => key.startsWith("session") && !key.includes("data"),
  );

  for (const [, sessionValue] of sessionEntries) {
    if (!Array.isArray(sessionValue)) continue;

    for (const entry of sessionValue) {
      if (!Array.isArray(entry) || entry.length < 1) continue;

      const [timing, scrambleMaybe, , dateMaybe] = entry;
      const timeBlock = Array.isArray(timing) ? timing : [0, timing];
      const timeMs =
        typeof timeBlock[1] === "number"
          ? timeBlock[1]
          : parseTimeString(String(timeBlock[1]));

      if (!timeMs || timeMs <= 0) continue;

      const status =
        typeof timeBlock[0] === "number"
          ? timeBlock[0]
          : parseInt(String(timeBlock[0]), 10) || 0;

      let penalty: "none" | "+2" | "DNF" = "none";
      if (status === -1) {
        penalty = "DNF";
      } else if (status === 2000) {
        penalty = "+2";
      }

      const scramble =
        typeof scrambleMaybe === "string" ? scrambleMaybe : undefined;

      let date: string | undefined;
      if (typeof dateMaybe === "number") {
        date = new Date(dateMaybe * 1000).toISOString();
      } else if (typeof dateMaybe === "string") {
        const parsed = Date.parse(dateMaybe);
        if (!isNaN(parsed)) {
          date = new Date(parsed).toISOString();
        }
      }

      solves.push({ time: timeMs, penalty, scramble, date });

      if (!puzzle && scramble) {
        puzzle = detectPuzzleType(scramble);
      }
    }
  }

  return { solves, detectedPuzzle: puzzle };
}

function parseCSTimerData(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    const jsonResult = parseCSTimerJson(trimmed);
    if (jsonResult.solves.length > 0) return jsonResult;
  }
  return parseCSTimerTxt(trimmed);
}

function parseCSTimerTxt(text: string): ParseResult {
  const solves: ParseResult["solves"] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const puzzle = detectPuzzleType(text);

  const skipPatterns = [
    /^generated/i,
    /^solves\/total/i,
    /^single/i,
    /^mean/i,
    /^avg/i,
    /^best/i,
    /^worst/i,
    /^session/i,
    /^-+$/,
    /^statistics/i,
    /^number of times/i,
    /^\d+\/\d+$/,
    /^average:/i,
    /^standard deviation/i,
    /^best time/i,
    /^worst time/i,
    /^current ao/i,
    /^best ao/i,
    /^session avg/i,
  ];

  for (const line of lines) {
    const shouldSkip = skipPatterns.some((p) => p.test(line));
    if (shouldSkip) continue;

    let timeMs: number | null = null;
    let penalty: "none" | "+2" | "DNF" = "none";
    let scramble: string | undefined;

    const dnfMatch = line.match(/^DNF\s*\(([^)]+)\)/i);
    if (dnfMatch) {
      timeMs = parseTimeString(dnfMatch[1]!.trim());
      penalty = "DNF";
    }

    const numberedMatch = line.match(
      /^\d+\.\s*(\d+[:.]\d+(?:\.\d+)?(?:\+)?|DNF\s*\([^)]+\))/i,
    );
    if (!timeMs && numberedMatch) {
      let timeStr = numberedMatch[1]!.trim();
      if (timeStr.endsWith("+")) {
        penalty = "+2";
        timeStr = timeStr.slice(0, -1);
      }
      if (timeStr.toUpperCase().startsWith("DNF")) {
        const inner = timeStr.match(/\(([^)]+)\)/);
        if (inner) {
          timeMs = parseTimeString(inner[1]!.trim());
          penalty = "DNF";
        }
      } else {
        timeMs = parseTimeString(timeStr);
      }

      const rest = line.slice(numberedMatch[0].length).trim();
      if (rest && !rest.match(/^[\d:.]+$/)) {
        scramble = rest;
      }
    }

    if (!timeMs) {
      const simpleTimeMatch = line.match(
        /^(\d+[:.]\d+(?:\.\d+)?(?:\+)?)\s*(.*)/,
      );
      if (simpleTimeMatch) {
        let timeStr = simpleTimeMatch[1]!.trim();
        const rest = simpleTimeMatch[2]?.trim();
        if (timeStr.endsWith("+")) {
          penalty = "+2";
          timeStr = timeStr.slice(0, -1);
        }
        timeMs = parseTimeString(timeStr);
        if (rest && !rest.match(/^[\d:.]+$/)) {
          scramble = rest;
        }
      }
    }

    if (!timeMs) {
      const anyTimeMatch = line.match(/(\d+):(\d+)\.(\d+)/);
      if (anyTimeMatch) {
        const minutes = parseInt(anyTimeMatch[1]!, 10);
        const seconds = parseInt(anyTimeMatch[2]!, 10);
        const fraction = anyTimeMatch[3]!;
        const centis =
          fraction.length === 3
            ? parseInt(fraction, 10)
            : fraction.length === 2
              ? parseInt(fraction, 10) * 10
              : parseInt(fraction, 10) * 100;
        timeMs = (minutes * 60 + seconds) * 1000 + centis;
      }
    }

    if (timeMs && timeMs > 0) {
      solves.push({
        time: timeMs,
        penalty,
        scramble,
      });
    }
  }

  return { solves, detectedPuzzle: puzzle ?? "333" };
}

interface ToggleRowProps {
  label: string;
  description?: string;
  shortcut?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  shortcut,
  checked,
  onChange,
  disabled = false,
}: ToggleRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange],
  );

  return (
    <div
      style={{
        ...styles.toggleRow,
        ...(isHovered && !disabled ? styles.toggleRowHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.labelContainer as React.CSSProperties}>
        <span style={styles.label}>
          {label}
          {shortcut && <span style={styles.kbd}>{shortcut}</span>}
        </span>
        {description && (
          <span style={styles.description as React.CSSProperties}>
            {description}
          </span>
        )}
      </div>
      <div style={styles.toggleContainer as React.CSSProperties}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          style={{
            ...styles.toggleInput,
            ...(disabled ? styles.toggleInputDisabled : {}),
          }}
        />
        <div
          style={{
            ...styles.toggleTrack,
            ...(checked ? styles.toggleTrackOn : styles.toggleTrackOff),
            ...(disabled ? styles.toggleTrackDisabled : {}),
          }}
        />
        <div
          style={{
            ...styles.toggleThumb,
            ...(checked ? styles.toggleThumbOn : styles.toggleThumbOff),
          }}
        />
      </div>
    </div>
  );
}

interface ImportStatus {
  type: "success" | "error";
  message: string;
  details?: string;
}

interface PendingImport {
  file: File;
  result: ParseResult;
}

interface PuzzlePickerModalProps {
  pendingImport: PendingImport;
  onConfirm: (puzzleId: WcaEventId) => void;
  onCancel: () => void;
}

function PuzzlePickerModal({
  pendingImport,
  onConfirm,
  onCancel,
}: PuzzlePickerModalProps) {
  const [selectedPuzzle, setSelectedPuzzle] = useState<WcaEventId>(
    (pendingImport.result.detectedPuzzle as WcaEventId) || "333",
  );
  const [hoveredPuzzle, setHoveredPuzzle] = useState<WcaEventId | null>(null);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onConfirm(selectedPuzzle);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, onConfirm, selectedPuzzle]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={styles.modalBackdrop as React.CSSProperties}
      onClick={handleBackdropClick}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>Import Solves</div>
        <div style={styles.modalSubtitle}>
          {pendingImport.result.solves.length} solve
          {pendingImport.result.solves.length !== 1 ? "s" : ""} found. Select
          target puzzle:
        </div>

        <div style={styles.fileInfo}>
          <div style={styles.fileName}>{pendingImport.file.name}</div>
          <div style={styles.fileSize}>
            {formatFileSize(pendingImport.file.size)}
          </div>
        </div>

        <div style={styles.puzzleGrid}>
          {PUZZLE_OPTIONS.map((puzzle) => (
            <button
              key={puzzle.id}
              onClick={() => setSelectedPuzzle(puzzle.id)}
              onMouseEnter={() => setHoveredPuzzle(puzzle.id)}
              onMouseLeave={() => setHoveredPuzzle(null)}
              style={{
                ...styles.puzzleButton,
                ...(selectedPuzzle === puzzle.id
                  ? styles.puzzleButtonSelected
                  : hoveredPuzzle === puzzle.id
                    ? styles.puzzleButtonHover
                    : {}),
              }}
            >
              {puzzle.label}
            </button>
          ))}
        </div>

        <div style={styles.modalActions}>
          <button
            onClick={onCancel}
            style={{
              ...styles.modalButton,
              ...styles.modalButtonCancel,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedPuzzle)}
            style={{
              ...styles.modalButton,
              ...styles.modalButtonConfirm,
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

export function Settings({
  inspectionEnabled,
  onInspectionChange,
  trainingModeEnabled,
  onTrainingModeChange,
  hideTimeDuringSolve,
  onHideTimeDuringSolveChange,
  showMilliseconds,
  onShowMillisecondsChange,
  onImportCSTimer,
  disabled = false,
}: SettingsProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (importStatus) {
      const timeout = setTimeout(() => setImportStatus(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [importStatus]);

  const handleFileParse = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "json") {
      setImportStatus({
        type: "error",
        message: "Unsupported file type",
        details: "Use .txt or .json from csTimer",
      });
      return;
    }

    try {
      const text = await file.text();
      const result = parseCSTimerData(text);

      if (result.solves.length === 0) {
        setImportStatus({
          type: "error",
          message: "No solves found",
          details: "Check the file format",
        });
        return;
      }

      setPendingImport({ file, result });
    } catch (err) {
      setImportStatus({
        type: "error",
        message: "Failed to read file",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const handleImportConfirm = useCallback(
    (puzzleId: WcaEventId) => {
      if (!pendingImport || !onImportCSTimer) return;

      try {
        const summary = onImportCSTimer({
          solves: pendingImport.result.solves,
          puzzle: pendingImport.result.detectedPuzzle ?? puzzleId,
          targetPuzzleId: puzzleId,
        });

        const puzzleLabel = resolvePuzzleLabel(summary.puzzleId);
        const importedCount = summary.imported;
        const plus2Count = summary.plus2;
        const dnfCount = summary.dnfs;

        setImportStatus({
          type: "success",
          message: `${importedCount} solve${importedCount !== 1 ? "s" : ""} imported`,
          details: `${puzzleLabel}${plus2Count ? ` · ${plus2Count} +2` : ""}${dnfCount ? ` · ${dnfCount} DNF` : ""}`,
        });
      } catch (err) {
        setImportStatus({
          type: "error",
          message: "Import failed",
          details: err instanceof Error ? err.message : "Unknown error",
        });
      }

      setPendingImport(null);
    },
    [pendingImport, onImportCSTimer],
  );

  const handleImportCancel = useCallback(() => {
    setPendingImport(null);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileParse(file);
      }
      e.target.value = "";
    },
    [handleFileParse],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileParse(file);
      }
    },
    [handleFileParse],
  );

  const handleZoneClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div style={styles.container as React.CSSProperties}>
      <span
        style={
          {
            ...styles.sectionHeader,
            ...styles.firstSectionHeader,
          } as React.CSSProperties
        }
      >
        Timer
      </span>

      <ToggleRow
        label="Inspection"
        shortcut="I"
        description="15s WCA inspection"
        checked={inspectionEnabled}
        onChange={onInspectionChange}
        disabled={disabled}
      />

      <span style={styles.sectionHeader as React.CSSProperties}>Display</span>

      <ToggleRow
        label="Hide During Solve"
        description="Hide time while running"
        checked={hideTimeDuringSolve}
        onChange={onHideTimeDuringSolveChange}
        disabled={disabled}
      />

      <ToggleRow
        label="Show Milliseconds"
        description="Display 3 decimal places"
        checked={showMilliseconds}
        onChange={onShowMillisecondsChange}
        disabled={disabled}
      />

      <span style={styles.sectionHeader as React.CSSProperties}>Training</span>

      <ToggleRow
        label="Training Mode"
        shortcut="T"
        description="Track split phases"
        checked={trainingModeEnabled}
        onChange={onTrainingModeChange}
        disabled={disabled}
      />

      {onImportCSTimer && (
        <div style={styles.importSection}>
          <span style={styles.sectionHeader as React.CSSProperties}>
            Import
          </span>

          <div
            onClick={handleZoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              ...styles.importZone,
              ...(isHovered && !disabled ? styles.importZoneHover : {}),
              ...(isDragOver ? styles.importZoneActive : {}),
              ...(disabled ? styles.importZoneDisabled : {}),
            }}
          >
            <div style={styles.importText as React.CSSProperties}>
              Drop csTimer export
            </div>
            <div style={styles.importHint}>.txt or .json</div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json"
            onChange={handleFileChange}
            style={styles.hiddenInput}
            disabled={disabled}
          />

          {importStatus && (
            <div
              style={{
                ...styles.importFeedback,
                ...(importStatus.type === "success"
                  ? styles.importSuccess
                  : styles.importError),
              }}
            >
              {importStatus.message}
              {importStatus.details && (
                <div style={styles.importDetails}>{importStatus.details}</div>
              )}
            </div>
          )}
        </div>
      )}

      {pendingImport && (
        <PuzzlePickerModal
          pendingImport={pendingImport}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}
    </div>
  );
}

export default Settings;
