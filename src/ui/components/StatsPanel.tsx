/**
 * StatsPanel: Statistics display with decimal-aligned numbers.
 */

import React, { useCallback, useMemo } from "react";
import {
  DurationMs,
  PersonalBest,
  RollingStats,
  StatWindowResult,
} from "../../types";

export interface StatsPanelProps {
  stats: RollingStats | null;
  personalBests: PersonalBest[];
  moXAo5Value: number;
  onMoXAo5Change: (value: number) => void;
  solveCount: number;
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
    gap: "var(--space-0)",
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "var(--space-1)",
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

  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-6) var(--space-3)",
    color: "var(--color-text-muted)",
    fontSize: "var(--text-sm)",
    textAlign: "center",
  } as React.CSSProperties,

  section: {
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,

  divider: {
    height: "1px",
    backgroundColor: "var(--color-border-subtle)",
    margin: "var(--space-2) 0",
  } as React.CSSProperties,

  /* Stat row styles — compact */
  statRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 0",
    minHeight: "22px",
  } as React.CSSProperties,

  statLabel: {
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  statValueContainer: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "flex-end",
    gap: "var(--space-1)",
  } as React.CSSProperties,

  statValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
    textAlign: "right",
    minWidth: "52px",
  } as React.CSSProperties,

  statValueWhole: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
    textAlign: "right",
  } as React.CSSProperties,

  statValueDecimal: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-secondary)",
    opacity: 0.8,
    minWidth: "18px",
    textAlign: "left",
  } as React.CSSProperties,

  statValueDisabled: {
    color: "var(--color-text-disabled)",
  } as React.CSSProperties,

  statValueDnf: {
    color: "var(--color-error-muted)",
    fontSize: "var(--text-xs)",
  } as React.CSSProperties,

  pbBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 4px",
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--color-pb)",
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderRadius: "var(--border-radius-sm)",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginLeft: "var(--space-1)",
  } as React.CSSProperties,

  /* MoXAo5 section — distinct styling */
  moXAo5Container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-2)",
    backgroundColor: "var(--color-surface-raised)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border-subtle)",
    marginTop: "var(--space-1)",
  } as React.CSSProperties,

  moXAo5Label: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,

  moXAo5Select: {
    padding: "2px 18px 2px 4px",
    fontSize: "var(--text-xs)",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius-sm)",
    cursor: "pointer",
    minWidth: "42px",
  } as React.CSSProperties,

  moXAo5Value: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
  } as React.CSSProperties,
};

interface StatRowProps {
  label: string;
  value: DurationMs | null;
  isPB?: boolean;
  isDnf?: boolean;
  isDisabled?: boolean;
  tooltip?: string;
}

function StatRow({
  label,
  value,
  isPB = false,
  isDnf = false,
  isDisabled = false,
  tooltip,
}: StatRowProps) {
  const formatted = formatTime(value);
  const showDecimal = formatted.decimal !== "" && !isDnf;

  return (
    <div style={styles.statRow} title={tooltip}>
      <span style={styles.statLabel}>{label}</span>
      <div style={styles.statValueContainer}>
        {isDnf ? (
          <span style={{ ...styles.statValue, ...styles.statValueDnf }}>
            DNF
          </span>
        ) : isDisabled ? (
          <span style={{ ...styles.statValue, ...styles.statValueDisabled }}>
            —
          </span>
        ) : (
          <>
            <span
              style={{
                ...styles.statValueWhole,
                ...(isDisabled ? styles.statValueDisabled : {}),
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
}: StatsPanelProps) {
  const isPB = useCallback(
    (type: PersonalBest["type"], size?: number): boolean => {
      return personalBests.some(
        (pb) => pb.type === type && (size === undefined || pb.size === size),
      );
    },
    [personalBests],
  );

  const getWindowValue = (
    result: StatWindowResult | null,
  ): DurationMs | null => {
    if (!result) return null;
    return result.valueMs;
  };

  const moXAo5Options = useMemo(() => [5, 10, 12, 20, 50, 100], []);

  const handleMoXAo5Change = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onMoXAo5Change(parseInt(e.target.value, 10));
    },
    [onMoXAo5Change],
  );

  if (!stats || solveCount === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerTitle as React.CSSProperties}>
            Statistics
          </span>
        </div>
        <div style={styles.emptyState as React.CSSProperties}>
          Complete solves to see statistics
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle as React.CSSProperties}>
          Statistics
        </span>
        <span style={styles.headerCount}>{solveCount}</span>
      </div>

      {/* Primary stats: Best / Worst / Mean */}
      <div style={styles.section as React.CSSProperties}>
        <StatRow label="Best" value={stats.bestMs} isPB={isPB("single")} />
        <StatRow label="Worst" value={stats.worstMs} />
        <StatRow label="Mean" value={stats.meanMs} />
      </div>

      <div style={styles.divider} />

      {/* Rolling averages */}
      <div style={styles.section as React.CSSProperties}>
        <StatRow
          label="Mo3"
          value={getWindowValue(stats.mo3)}
          isPB={isPB("mo3", 3)}
          isDnf={stats.mo3?.isDnf}
          isDisabled={!stats.mo3}
          tooltip={stats.mo3?.isDnf ? "Contains 2+ DNFs" : undefined}
        />
        <StatRow
          label="Ao5"
          value={getWindowValue(stats.ao5)}
          isPB={isPB("ao5", 5)}
          isDnf={stats.ao5?.isDnf}
          isDisabled={!stats.ao5}
          tooltip={stats.ao5?.isDnf ? "Too many DNFs for average" : undefined}
        />
        <StatRow
          label="Ao12"
          value={getWindowValue(stats.ao12)}
          isPB={isPB("ao12", 12)}
          isDnf={stats.ao12?.isDnf}
          isDisabled={!stats.ao12}
          tooltip={stats.ao12?.isDnf ? "Too many DNFs for average" : undefined}
        />

        {/* Larger windows — only show if available */}
        {stats.ao50 && (
          <StatRow
            label="Ao50"
            value={getWindowValue(stats.ao50)}
            isDnf={stats.ao50?.isDnf}
          />
        )}
        {stats.ao100 && (
          <StatRow
            label="Ao100"
            value={getWindowValue(stats.ao100)}
            isDnf={stats.ao100?.isDnf}
          />
        )}
        {stats.ao1000 && (
          <StatRow
            label="Ao1000"
            value={getWindowValue(stats.ao1000)}
            isDnf={stats.ao1000?.isDnf}
          />
        )}
      </div>

      <div style={styles.divider} />

      {/* MoXAo5 — Custom rolling average */}
      <div style={styles.moXAo5Container}>
        <div style={styles.moXAo5Label}>
          <span>Mo</span>
          <select
            value={moXAo5Value}
            onChange={handleMoXAo5Change}
            style={styles.moXAo5Select}
            aria-label="Select MoXAo5 window size"
          >
            {moXAo5Options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>Ao5</span>
        </div>
        <span
          style={{
            ...styles.moXAo5Value,
            ...(stats.moXAo5?.result?.isDnf ? styles.statValueDnf : {}),
            ...(!stats.moXAo5?.result ? styles.statValueDisabled : {}),
          }}
        >
          {stats.moXAo5?.result
            ? stats.moXAo5.result.isDnf
              ? "DNF"
              : formatTimeSimple(stats.moXAo5.result.valueMs)
            : "—"}
        </span>
      </div>
    </div>
  );
}

export default StatsPanel;
