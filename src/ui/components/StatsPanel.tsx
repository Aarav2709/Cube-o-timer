import React, { useCallback, useMemo, useState } from "react";
import { SessionStatsResult } from "../../statsEngine";
import {
  DurationMs,
  PersonalBest,
  SolveId,
  StatWindowResult,
  TimelinePoint,
} from "../../types";

export interface StatsPanelProps {
  stats: SessionStatsResult | null;
  personalBests?: PersonalBest[];
  moXAo5Value: number;
  onMoXAo5Change: (value: number) => void;
  solveCount: number;
  selectedSolveId?: SolveId | null;
}

interface FormattedTime {
  whole: string;
  decimal: string;
}

function formatTime(ms: DurationMs | null): FormattedTime {
  if (ms === null) return { whole: "DNF", decimal: "" };
  if (ms < 0) ms = 0;

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);

  const decimalStr = centis.toString().padStart(2, "0");

  if (minutes > 0) {
    const secStr = seconds.toString().padStart(2, "0");
    return { whole: `${minutes}:${secStr}`, decimal: decimalStr };
  }

  return { whole: seconds.toString(), decimal: decimalStr };
}

function formatTimeSimple(ms: DurationMs | null): string {
  const { whole, decimal } = formatTime(ms);
  if (decimal === "") return whole;
  return `${whole}.${decimal}`;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  } as React.CSSProperties,

  headerTitle: {
    fontSize: "9px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  } as React.CSSProperties,

  headerCount: {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    color: "var(--color-text-muted)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500,
  } as React.CSSProperties,

  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-4) var(--space-2)",
    color: "var(--color-text-muted)",
    fontSize: "var(--text-xs)",
    textAlign: "center",
  } as React.CSSProperties,

  section: {
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: "8px",
    fontWeight: 600,
    color: "var(--color-text-disabled)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginTop: "8px",
    marginBottom: "2px",
  } as React.CSSProperties,

  statRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1px 0",
    minHeight: "17px",
  } as React.CSSProperties,

  statLabel: {
    fontSize: "10px",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  statValueContainer: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "flex-end",
    gap: "1px",
  } as React.CSSProperties,

  statValueWhole: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
    textAlign: "right",
  } as React.CSSProperties,

  statValueDecimal: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-secondary)",
    opacity: 0.7,
    minWidth: "14px",
    textAlign: "left",
  } as React.CSSProperties,

  statValueDisabled: {
    color: "var(--color-text-disabled)",
  } as React.CSSProperties,

  statValueDnf: {
    color: "var(--color-error-muted)",
    fontSize: "10px",
  } as React.CSSProperties,

  statValueHighlight: {
    color: "var(--color-focus)",
  } as React.CSSProperties,

  pbBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0 2px",
    fontSize: "7px",
    fontWeight: 700,
    color: "rgba(167, 139, 250, 0.9)",
    backgroundColor: "rgba(167, 139, 250, 0.1)",
    borderRadius: "2px",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    marginLeft: "4px",
    lineHeight: 1.4,
  } as React.CSSProperties,

  moXAo5Container: {
    marginTop: "10px",
    padding: "8px",
    backgroundColor: "var(--color-surface)",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border-subtle)",
  } as React.CSSProperties,

  moXAo5Header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "6px",
  } as React.CSSProperties,

  moXAo5Label: {
    fontSize: "9px",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  } as React.CSSProperties,

  moXAo5Value: {
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  moXAo5Buttons: {
    display: "flex",
    gap: "3px",
  } as React.CSSProperties,

  moXAo5Button: {
    flex: 1,
    padding: "4px 0",
    fontSize: "9px",
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    color: "var(--color-text-muted)",
    backgroundColor: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 40ms ease-out",
  } as React.CSSProperties,

  moXAo5ButtonActive: {
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    borderColor: "var(--color-focus)",
    color: "var(--color-focus)",
  } as React.CSSProperties,

  moXAo5ButtonHover: {
    borderColor: "var(--color-text-muted)",
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,
};

const MOX_OPTIONS = [5, 10, 12, 20, 50, 100];

interface StatRowProps {
  label: string;
  value: DurationMs | null;
  isPB?: boolean;
  isDnf?: boolean;
  isDisabled?: boolean;
  isHighlighted?: boolean;
}

function StatRow({
  label,
  value,
  isPB = false,
  isDnf = false,
  isDisabled = false,
  isHighlighted = false,
}: StatRowProps) {
  const formatted = formatTime(value);
  const showDecimal = formatted.decimal !== "" && !isDnf;

  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <div style={styles.statValueContainer}>
        {isDnf ? (
          <span style={{ ...styles.statValueWhole, ...styles.statValueDnf }}>
            DNF
          </span>
        ) : isDisabled ? (
          <span
            style={{ ...styles.statValueWhole, ...styles.statValueDisabled }}
          >
            —
          </span>
        ) : (
          <>
            <span
              style={{
                ...styles.statValueWhole,
                ...(isHighlighted ? styles.statValueHighlight : {}),
              }}
            >
              {formatted.whole}
            </span>
            {showDecimal && (
              <span style={styles.statValueDecimal as React.CSSProperties}>
                .{formatted.decimal}
              </span>
            )}
          </>
        )}
        {isPB && <span style={styles.pbBadge}>PB</span>}
      </div>
    </div>
  );
}

export function StatsPanel({
  stats,
  personalBests,
  moXAo5Value,
  onMoXAo5Change,
  solveCount,
  selectedSolveId,
}: StatsPanelProps) {
  const rolling = stats?.rolling ?? null;
  const timeline = stats?.timeline ?? [];
  const pbList = useMemo(
    () => personalBests ?? stats?.personalBests ?? [],
    [personalBests, stats?.personalBests],
  );

  const indexById = useMemo(() => {
    const map = new Map<SolveId, number>();
    timeline.forEach((t: TimelinePoint) => map.set(t.solveId, t.index));
    return map;
  }, [timeline]);

  const selectedIndex =
    selectedSolveId != null ? indexById.get(selectedSolveId) : undefined;

  const isPB = useCallback(
    (type: PersonalBest["type"], size?: number): boolean => {
      return pbList.some(
        (pb: PersonalBest) =>
          pb.type === type && (size === undefined || pb.size === size),
      );
    },
    [pbList],
  );

  const getWindowValue = (
    result: StatWindowResult | null,
  ): DurationMs | null => {
    if (!result) return null;
    return result.valueMs;
  };

  const isSelectedInWindow = (result: StatWindowResult | null): boolean => {
    if (selectedIndex === undefined || !result) return false;
    return result.indices.includes(selectedIndex);
  };

  const isSelectedSinglePB = useMemo(() => {
    if (!selectedSolveId) return false;
    return pbList.some(
      (pb: PersonalBest) =>
        pb.type === "single" && pb.solveIds.includes(selectedSolveId),
    );
  }, [pbList, selectedSolveId]);

  const [hoveredMoX, setHoveredMoX] = useState<number | null>(null);

  if (!rolling || solveCount === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerTitle as React.CSSProperties}>
            Statistics
          </span>
        </div>
        <div style={styles.emptyState as React.CSSProperties}>
          Complete solves to see stats
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle as React.CSSProperties}>
          Statistics
        </span>
        <span style={styles.headerCount}>{solveCount}</span>
      </div>

      <div style={styles.section as React.CSSProperties}>
        <StatRow
          label="Best"
          value={rolling.bestMs}
          isPB={isPB("single")}
          isHighlighted={isSelectedSinglePB}
        />
        <StatRow label="Worst" value={rolling.worstMs} />
        <StatRow label="Mean" value={rolling.meanMs} />
      </div>

      <span style={styles.sectionLabel as React.CSSProperties}>Averages</span>

      <div style={styles.section as React.CSSProperties}>
        <StatRow
          label="Mo3"
          value={getWindowValue(rolling.mo3)}
          isPB={isPB("mo3", 3)}
          isDnf={rolling.mo3?.isDnf}
          isDisabled={!rolling.mo3}
          isHighlighted={isSelectedInWindow(rolling.mo3)}
        />
        <StatRow
          label="Ao5"
          value={getWindowValue(rolling.ao5)}
          isPB={isPB("ao5", 5)}
          isDnf={rolling.ao5?.isDnf}
          isDisabled={!rolling.ao5}
          isHighlighted={isSelectedInWindow(rolling.ao5)}
        />
        <StatRow
          label="Ao12"
          value={getWindowValue(rolling.ao12)}
          isPB={isPB("ao12", 12)}
          isDnf={rolling.ao12?.isDnf}
          isDisabled={!rolling.ao12}
          isHighlighted={isSelectedInWindow(rolling.ao12)}
        />
        {rolling.ao50 && (
          <StatRow
            label="Ao50"
            value={getWindowValue(rolling.ao50)}
            isDnf={rolling.ao50?.isDnf}
            isHighlighted={isSelectedInWindow(rolling.ao50)}
          />
        )}
        {rolling.ao100 && (
          <StatRow
            label="Ao100"
            value={getWindowValue(rolling.ao100)}
            isDnf={rolling.ao100?.isDnf}
            isHighlighted={isSelectedInWindow(rolling.ao100)}
          />
        )}
        {rolling.ao1000 && (
          <StatRow
            label="Ao1000"
            value={getWindowValue(rolling.ao1000)}
            isDnf={rolling.ao1000?.isDnf}
            isHighlighted={isSelectedInWindow(rolling.ao1000)}
          />
        )}
      </div>

      <div style={styles.moXAo5Container}>
        <div style={styles.moXAo5Header}>
          <span style={styles.moXAo5Label}>Mo{moXAo5Value} Ao5</span>
          <span
            style={{
              ...styles.moXAo5Value,
              ...(rolling.moXAo5?.result?.isDnf ? styles.statValueDnf : {}),
              ...(!rolling.moXAo5?.result ? styles.statValueDisabled : {}),
              ...(isSelectedInWindow(rolling.moXAo5?.result ?? null)
                ? styles.statValueHighlight
                : {}),
            }}
          >
            {rolling.moXAo5?.result
              ? rolling.moXAo5.result.isDnf
                ? "DNF"
                : formatTimeSimple(rolling.moXAo5.result.valueMs)
              : "—"}
          </span>
        </div>
        <div style={styles.moXAo5Buttons}>
          {MOX_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onMoXAo5Change(opt)}
              onMouseEnter={() => setHoveredMoX(opt)}
              onMouseLeave={() => setHoveredMoX(null)}
              style={{
                ...styles.moXAo5Button,
                ...(moXAo5Value === opt ? styles.moXAo5ButtonActive : {}),
                ...(hoveredMoX === opt && moXAo5Value !== opt
                  ? styles.moXAo5ButtonHover
                  : {}),
              }}
              aria-pressed={moXAo5Value === opt}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
