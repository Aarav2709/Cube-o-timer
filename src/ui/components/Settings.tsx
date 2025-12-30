/**
 * Settings panel with inspection toggle, training mode, and CSTimer import.
 * Supports both JSON and .txt CSTimer export formats.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

export interface SettingsProps {
  inspectionEnabled: boolean;
  onInspectionChange: (enabled: boolean) => void;
  trainingModeEnabled: boolean;
  onTrainingModeChange: (enabled: boolean) => void;
  onImportCSTimer?: (data: CSTimerImportData) => void;
  disabled?: boolean;
}

export interface CSTimerSolve {
  time: number;
  penalty: "none" | "+2" | "DNF";
  scramble?: string;
  date?: string;
}

export interface CSTimerImportData {
  solves: CSTimerSolve[];
  puzzle?: string;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,

  header: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "var(--space-2)",
  } as React.CSSProperties,

  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-2) 0",
    borderBottom: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  toggleRowLast: {
    borderBottom: "none",
  } as React.CSSProperties,

  labelContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    marginRight: "var(--space-2)",
  } as React.CSSProperties,

  label: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  description: {
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
    lineHeight: 1.35,
  } as React.CSSProperties,

  toggleContainer: {
    position: "relative",
    width: "36px",
    height: "20px",
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
    borderRadius: "10px",
    transition: "background-color var(--transition-normal)",
  } as React.CSSProperties,

  toggleTrackOff: {
    backgroundColor: "var(--color-border)",
  } as React.CSSProperties,

  toggleTrackOn: {
    backgroundColor: "rgba(74, 222, 128, 0.3)",
  } as React.CSSProperties,

  toggleTrackDisabled: {
    opacity: 0.5,
  } as React.CSSProperties,

  toggleThumb: {
    position: "absolute",
    top: "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    transition:
      "left var(--transition-normal), background-color var(--transition-normal)",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
  } as React.CSSProperties,

  toggleThumbOff: {
    left: "2px",
    backgroundColor: "var(--color-text-muted)",
  } as React.CSSProperties,

  toggleThumbOn: {
    left: "18px",
    backgroundColor: "var(--color-ready)",
  } as React.CSSProperties,

  importSection: {
    marginTop: "var(--space-3)",
    paddingTop: "var(--space-2)",
    borderTop: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  importLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "var(--space-2)",
  } as React.CSSProperties,

  importZone: {
    padding: "var(--space-3)",
    border: "1px dashed var(--color-border)",
    borderRadius: "var(--border-radius-md)",
    backgroundColor: "var(--color-surface)",
    textAlign: "center",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  } as React.CSSProperties,

  importZoneHover: {
    borderColor: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface-raised)",
  } as React.CSSProperties,

  importZoneActive: {
    borderColor: "var(--color-focus)",
    backgroundColor: "rgba(96, 165, 250, 0.05)",
  } as React.CSSProperties,

  importZoneDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as React.CSSProperties,

  importText: {
    fontSize: "var(--text-xs)",
    color: "var(--color-text-secondary)",
    marginBottom: "2px",
  } as React.CSSProperties,

  importHint: {
    fontSize: "var(--text-xs)",
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  importSuccess: {
    fontSize: "var(--text-xs)",
    color: "var(--color-ready)",
    marginTop: "var(--space-2)",
  } as React.CSSProperties,

  importError: {
    fontSize: "var(--text-xs)",
    color: "var(--color-error)",
    marginTop: "var(--space-2)",
  } as React.CSSProperties,

  hiddenInput: {
    display: "none",
  } as React.CSSProperties,
};

interface CSTimerRawSolve {
  time?: number | [number, number];
  penalty?: number;
  scramble?: string;
  date?: number | string;
}

interface CSTimerExport {
  [key: string]:
    | CSTimerRawSolve[]
    | {
        times?: CSTimerRawSolve[];
        name?: string;
        opt?: { scrType?: string };
      };
}

/**
 * Parse CSTimer JSON export format.
 */
function parseCSTimerJSON(json: unknown): CSTimerImportData {
  const solves: CSTimerSolve[] = [];
  let puzzle: string | undefined;

  if (!json || typeof json !== "object") {
    throw new Error("Invalid CSTimer export format.");
  }

  const data = json as CSTimerExport;

  for (const key of Object.keys(data)) {
    const session = data[key];
    if (!session) continue;

    let times: CSTimerRawSolve[] = [];
    if (Array.isArray(session)) {
      times = session;
    } else if (typeof session === "object" && "times" in session) {
      times = session.times || [];
      if (session.opt?.scrType && !puzzle) {
        puzzle = session.opt.scrType;
      }
    }

    for (const rawSolve of times) {
      if (!rawSolve) continue;

      let timeMs: number;
      let penaltyValue: number = 0;

      if (Array.isArray(rawSolve)) {
        penaltyValue = (rawSolve as number[])[0] || 0;
        const timeValue = (rawSolve as number[])[1];
        timeMs = typeof timeValue === "number" ? timeValue * 10 : 0;
      } else if (typeof rawSolve === "object") {
        if (Array.isArray(rawSolve.time)) {
          penaltyValue = rawSolve.time[0] || 0;
          timeMs = (rawSolve.time[1] || 0) * 10;
        } else {
          timeMs = typeof rawSolve.time === "number" ? rawSolve.time * 10 : 0;
          penaltyValue = rawSolve.penalty || 0;
        }
      } else {
        continue;
      }

      if (timeMs <= 0) continue;

      let penalty: "none" | "+2" | "DNF" = "none";
      if (penaltyValue === -1) {
        penalty = "DNF";
      } else if (penaltyValue === 2000 || penaltyValue === 2) {
        penalty = "+2";
      }

      let scramble: string | undefined;
      let date: string | undefined;

      if (Array.isArray(rawSolve)) {
        scramble =
          typeof (rawSolve as unknown[])[2] === "string"
            ? ((rawSolve as unknown[])[2] as string)
            : undefined;
        const rawDate = (rawSolve as unknown[])[3];
        if (typeof rawDate === "number") {
          date = new Date(rawDate).toISOString();
        } else if (typeof rawDate === "string") {
          date = rawDate;
        }
      } else if (typeof rawSolve === "object") {
        scramble = rawSolve.scramble;
        if (typeof rawSolve.date === "number") {
          date = new Date(rawSolve.date).toISOString();
        } else if (typeof rawSolve.date === "string") {
          date = rawSolve.date;
        }
      }

      solves.push({ time: timeMs, penalty, scramble, date });
    }
  }

  if (solves.length === 0) {
    throw new Error("No valid solves found in CSTimer export.");
  }

  return { solves, puzzle };
}

/**
 * Parse CSTimer .txt export format.
 * Format: "No.  Time  Penalty  Comment\n1.  12.34  OK  scramble..."
 * Or simpler: lines with times like "12.34" or "12.34+" or "DNF(12.34)"
 */
function parseCSTimerTxt(text: string): CSTimerImportData {
  const solves: CSTimerSolve[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Try to detect puzzle type from header
  let puzzle: string | undefined;
  const headerMatch = text.match(/puzzle[:\s]+(\w+)/i);
  if (headerMatch) {
    puzzle = headerMatch[1];
  }

  // Regex patterns for different CSTimer .txt formats
  const timePatterns = [
    // Format: "1. 12.34  OK  R U R' U'..."
    /^\d+\.\s+([\d:.]+)(\+?)(?:\s+(DNF|OK|\+2))?(?:\s+(.*))?$/i,
    // Format: "DNF(12.34)" or "12.34+" or "12.34"
    /^(DNF)?\(?([\d:.]+)\)?(\+)?$/i,
    // Format: just time with optional penalty
    /^([\d:.]+)(\+)?(?:\s+(DNF))?$/i,
  ];

  for (const line of lines) {
    // Skip header lines
    if (
      line.toLowerCase().includes("time") &&
      line.toLowerCase().includes("no")
    ) {
      continue;
    }
    if (line.startsWith("---") || line.startsWith("===")) {
      continue;
    }
    if (
      line.toLowerCase().includes("generated by") ||
      line.toLowerCase().includes("cstimer")
    ) {
      continue;
    }
    if (line.toLowerCase().includes("session")) {
      continue;
    }
    if (
      line.toLowerCase().includes("average") ||
      line.toLowerCase().includes("mean")
    ) {
      continue;
    }
    if (
      line.toLowerCase().includes("best") ||
      line.toLowerCase().includes("worst")
    ) {
      continue;
    }

    let timeMs: number | null = null;
    let penalty: "none" | "+2" | "DNF" = "none";
    let scramble: string | undefined;

    for (const pattern of timePatterns) {
      const match = line.match(pattern);
      if (match) {
        let timeStr: string | undefined;

        if (pattern === timePatterns[0]) {
          // Format: "1. 12.34  OK  R U R' U'..."
          timeStr = match[1];
          if (match[2] === "+" || match[3]?.toUpperCase() === "+2") {
            penalty = "+2";
          } else if (match[3]?.toUpperCase() === "DNF") {
            penalty = "DNF";
          }
          scramble = match[4]?.trim();
        } else if (pattern === timePatterns[1]) {
          // Format: "DNF(12.34)" or "12.34+"
          if (match[1]?.toUpperCase() === "DNF") {
            penalty = "DNF";
          }
          timeStr = match[2];
          if (match[3] === "+") {
            penalty = "+2";
          }
        } else {
          // Format: "12.34+" or "12.34 DNF"
          timeStr = match[1];
          if (match[2] === "+") {
            penalty = "+2";
          }
          if (match[3]?.toUpperCase() === "DNF") {
            penalty = "DNF";
          }
        }

        // Parse time string (supports "1:23.45" and "12.34")
        if (timeStr) {
          timeMs = parseTimeString(timeStr);
          if (timeMs !== null) break;
        }
      }
    }

    // Try to extract time from anywhere in the line as last resort
    if (timeMs === null) {
      const anyTimeMatch = line.match(/([\d]+:)?(\d+)\.(\d{2})/);
      if (anyTimeMatch && anyTimeMatch[2] && anyTimeMatch[3]) {
        const minutes = anyTimeMatch[1] ? parseInt(anyTimeMatch[1]) : 0;
        const seconds = parseInt(anyTimeMatch[2]);
        const centis = parseInt(anyTimeMatch[3]);
        timeMs = (minutes * 60 + seconds) * 1000 + centis * 10;

        // Check for penalties in the line
        if (line.toLowerCase().includes("dnf")) {
          penalty = "DNF";
        } else if (
          line.includes("+") &&
          !line.includes("R'") &&
          !line.includes("U'")
        ) {
          penalty = "+2";
        }
      }
    }

    if (timeMs !== null && timeMs > 0) {
      solves.push({ time: timeMs, penalty, scramble });
    }
  }

  if (solves.length === 0) {
    throw new Error("No valid solves found in CSTimer .txt export.");
  }

  return { solves, puzzle };
}

/**
 * Parse a time string like "12.34" or "1:23.45" into milliseconds.
 */
function parseTimeString(timeStr: string): number | null {
  if (!timeStr) return null;

  // Handle minute:second format
  const minSecMatch = timeStr.match(/^(\d+):(\d+)\.(\d+)$/);
  if (minSecMatch && minSecMatch[1] && minSecMatch[2] && minSecMatch[3]) {
    const minutes = parseInt(minSecMatch[1]);
    const seconds = parseInt(minSecMatch[2]);
    const fraction = minSecMatch[3];
    const centis =
      fraction.length === 2
        ? parseInt(fraction)
        : parseInt(fraction.slice(0, 2));
    return (minutes * 60 + seconds) * 1000 + centis * 10;
  }

  // Handle second.centis format
  const secMatch = timeStr.match(/^(\d+)\.(\d+)$/);
  if (secMatch && secMatch[1] && secMatch[2]) {
    const seconds = parseInt(secMatch[1]);
    const fraction = secMatch[2];
    const centis =
      fraction.length === 2
        ? parseInt(fraction)
        : parseInt(fraction.slice(0, 2));
    return seconds * 1000 + centis * 10;
  }

  return null;
}

/**
 * Parse CSTimer export, detecting format automatically.
 */
function parseCSTimerExport(content: string): CSTimerImportData {
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      return parseCSTimerJSON(json);
    } catch {
      // Fall through to txt parsing
    }
  }

  // Try .txt format
  return parseCSTimerTxt(trimmed);
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  shortcut?: string;
  isLast?: boolean;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  shortcut,
  isLast = false,
}: ToggleRowProps) {
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
        ...(isLast ? styles.toggleRowLast : {}),
      }}
    >
      <div style={styles.labelContainer as React.CSSProperties}>
        <span style={styles.label}>
          {label}
          {shortcut && <span className="kbd">{shortcut}</span>}
        </span>
        {description && <span style={styles.description}>{description}</span>}
      </div>

      <div style={styles.toggleContainer as React.CSSProperties}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          style={
            {
              ...styles.toggleInput,
              ...(disabled ? styles.toggleInputDisabled : {}),
            } as React.CSSProperties
          }
          aria-label={label}
        />
        <div
          style={
            {
              ...styles.toggleTrack,
              ...(checked ? styles.toggleTrackOn : styles.toggleTrackOff),
              ...(disabled ? styles.toggleTrackDisabled : {}),
            } as React.CSSProperties
          }
        />
        <div
          style={
            {
              ...styles.toggleThumb,
              ...(checked ? styles.toggleThumbOn : styles.toggleThumbOff),
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

export function Settings({
  inspectionEnabled,
  onInspectionChange,
  trainingModeEnabled,
  onTrainingModeChange,
  onImportCSTimer,
  disabled = false,
}: SettingsProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (importStatus) {
      const timeout = setTimeout(() => setImportStatus(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [importStatus]);

  const handleFileImport = useCallback(
    async (file: File) => {
      if (!onImportCSTimer) return;

      try {
        const text = await file.text();
        const data = parseCSTimerExport(text);
        onImportCSTimer(data);
        setImportStatus({
          type: "success",
          message: `Imported ${data.solves.length} solves.`,
        });
      } catch (err) {
        setImportStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Import failed.",
        });
      }
    },
    [onImportCSTimer],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileImport(file);
      }
      e.target.value = "";
    },
    [handleFileImport],
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

      const file = e.dataTransfer.files?.[0];
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "json" || ext === "txt") {
          handleFileImport(file);
        } else {
          setImportStatus({
            type: "error",
            message: "Please drop a .txt or .json file.",
          });
        }
      }
    },
    [handleFileImport],
  );

  const handleZoneClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div style={styles.container}>
      <div style={styles.header as React.CSSProperties}>Settings</div>

      <ToggleRow
        label="Inspection"
        description="15s WCA inspection period."
        checked={inspectionEnabled}
        onChange={onInspectionChange}
        disabled={disabled}
        shortcut="I"
      />

      <ToggleRow
        label="Training Mode"
        description="Track split times during solves."
        checked={trainingModeEnabled}
        onChange={onTrainingModeChange}
        disabled={disabled}
        shortcut="T"
        isLast
      />

      {onImportCSTimer && (
        <div style={styles.importSection}>
          <div style={styles.importLabel as React.CSSProperties}>Import</div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={handleFileChange}
            style={styles.hiddenInput}
            disabled={disabled}
            aria-label="Import CSTimer data"
          />

          <div
            style={{
              ...styles.importZone,
              ...(isHovered && !disabled ? styles.importZoneHover : {}),
              ...(isDragOver ? styles.importZoneActive : {}),
              ...(disabled ? styles.importZoneDisabled : {}),
            }}
            onClick={handleZoneClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.code === "Enter" || e.code === "Space") {
                e.preventDefault();
                handleZoneClick();
              }
            }}
            aria-label="Import CSTimer data"
          >
            <div style={styles.importText}>Import CSTimer data</div>
            <div style={styles.importHint}>
              Drop .txt or .json file, or click to browse.
            </div>
          </div>

          {importStatus && (
            <div
              style={
                importStatus.type === "success"
                  ? styles.importSuccess
                  : styles.importError
              }
            >
              {importStatus.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Settings;
