import React, { useMemo } from "react";
import { DurationMs, SplitCapture, SplitPhaseDefinition } from "../../types";
import { computePhaseDurations } from "../../splits";

export interface SplitBreakdownProps {
  phases: SplitPhaseDefinition[];
  capture: SplitCapture | null;
  totalDurationMs: DurationMs | null;
  phaseAverages?: Record<string, DurationMs>;
}

function formatTime(ms: DurationMs | null): string {
  if (ms === null || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${seconds}.${centis.toString().padStart(2, "0")}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: "8px",
    backgroundColor: "var(--color-surface)",
    borderRadius: "4px",
    border: "1px solid var(--color-border)",
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

  phaseRow: {
    display: "flex",
    alignItems: "center",
    padding: "2px 0",
    borderBottom: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  phaseName: {
    flex: 1,
    fontSize: "10px",
    fontWeight: 500,
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  phaseTime: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
    minWidth: "38px",
    textAlign: "right",
  } as React.CSSProperties,

  phaseTimeEmpty: {
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  phasePercent: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-muted)",
    minWidth: "24px",
    textAlign: "right",
    marginLeft: "4px",
  } as React.CSSProperties,

  progressContainer: {
    width: "32px",
    height: "2px",
    backgroundColor: "var(--color-border)",
    borderRadius: "1px",
    marginLeft: "6px",
    overflow: "hidden",
  } as React.CSSProperties,

  progressBar: {
    height: "100%",
    backgroundColor: "var(--color-ready)",
    borderRadius: "1px",
    transition: "width 80ms ease-out",
  } as React.CSSProperties,

  deltaContainer: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    minWidth: "32px",
    textAlign: "right",
    marginLeft: "4px",
  } as React.CSSProperties,

  deltaPositive: {
    color: "var(--color-error-muted)",
  } as React.CSSProperties,

  deltaNegative: {
    color: "var(--color-ready)",
  } as React.CSSProperties,

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "2px 0",
    marginTop: "2px",
    borderTop: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  summaryLabel: {
    fontSize: "9px",
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,

  summaryValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  untrackedValue: {
    color: "var(--color-warn)",
  } as React.CSSProperties,
};

interface PhaseBreakdownRowProps {
  name: string;
  duration: DurationMs | null;
  percentage: number | null;
  average?: DurationMs;
}

function PhaseBreakdownRow({
  name,
  duration,
  percentage,
  average,
}: PhaseBreakdownRowProps) {
  const delta = useMemo(() => {
    if (duration === null || average === undefined) return null;
    return duration - average;
  }, [duration, average]);

  return (
    <div style={styles.phaseRow}>
      <span style={styles.phaseName}>{name}</span>
      <span
        style={{
          ...styles.phaseTime,
          ...(duration === null ? styles.phaseTimeEmpty : {}),
        }}
      >
        {formatTime(duration)}
      </span>
      <span style={styles.phasePercent as React.CSSProperties}>
        {percentage !== null ? formatPercent(percentage) : "—"}
      </span>
      <div style={styles.progressContainer}>
        <div
          style={{
            ...styles.progressBar,
            width: `${Math.min(percentage ?? 0, 100)}%`,
          }}
        />
      </div>
      {average !== undefined && (
        <span
          style={
            {
              ...styles.deltaContainer,
              ...(delta !== null && delta > 0 ? styles.deltaPositive : {}),
              ...(delta !== null && delta < 0 ? styles.deltaNegative : {}),
            } as React.CSSProperties
          }
        >
          {delta !== null
            ? `${delta >= 0 ? "+" : "-"}${formatTime(Math.abs(delta))}`
            : "—"}
        </span>
      )}
    </div>
  );
}

export function SplitBreakdown({
  phases,
  capture,
  totalDurationMs,
  phaseAverages,
}: SplitBreakdownProps) {
  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.order - b.order),
    [phases],
  );

  const phaseDurations = useMemo(() => {
    if (!capture) return {};
    return computePhaseDurations({
      definitions: phases,
      capture,
      endTimestampMs: totalDurationMs ?? undefined,
    });
  }, [phases, capture, totalDurationMs]);

  const phasePercentages = useMemo(() => {
    if (!totalDurationMs || totalDurationMs <= 0) return {};
    const percentages: Record<string, number> = {};
    for (const [phase, duration] of Object.entries(phaseDurations)) {
      if (duration !== null) {
        percentages[phase] = (duration / totalDurationMs) * 100;
      }
    }
    return percentages;
  }, [phaseDurations, totalDurationMs]);

  const totalTrackedMs = useMemo(() => {
    return Object.values(phaseDurations).reduce<number>(
      (sum, d) => sum + (d ?? 0),
      0,
    );
  }, [phaseDurations]);

  if (sortedPhases.length === 0 || !capture || capture.phases.length === 0) {
    return null;
  }

  const untrackedMs =
    totalDurationMs != null ? totalDurationMs - totalTrackedMs : 0;
  const hasUntracked = untrackedMs > 100;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle as React.CSSProperties}>Splits</span>
        <span style={styles.headerCount}>
          {capture.phases.length}/{sortedPhases.length}
        </span>
      </div>

      {sortedPhases.map((phase) => {
        const duration = phaseDurations[phase.name] ?? null;
        const percentage = phasePercentages[phase.name] ?? null;
        return (
          <PhaseBreakdownRow
            key={phase.name}
            name={phase.name}
            duration={duration}
            percentage={percentage}
            average={phaseAverages?.[phase.name]}
          />
        );
      })}

      {hasUntracked && (
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Untracked</span>
          <span style={{ ...styles.summaryValue, ...styles.untrackedValue }}>
            {formatTime(untrackedMs)}
          </span>
        </div>
      )}

      <div style={styles.summaryRow}>
        <span style={styles.summaryLabel}>Total</span>
        <span style={styles.summaryValue}>{formatTime(totalDurationMs)}</span>
      </div>
    </div>
  );
}

export default SplitBreakdown;
