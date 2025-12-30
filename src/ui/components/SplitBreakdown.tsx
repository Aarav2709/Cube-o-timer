/**
 * SplitBreakdown: Post-solve breakdown of split/phase timings.
 */

import React, { useMemo } from "react";
import { DurationMs, SplitCapture, SplitPhaseDefinition } from "../../types";
import { computePhaseDurations } from "../../splits";

export interface SplitBreakdownProps {
  phases: SplitPhaseDefinition[];
  capture: SplitCapture | null;
  totalDurationMs: DurationMs | null;
  /** Optional historical averages per phase for comparison */
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
    padding: "var(--space-3)",
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border)",
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "var(--space-2)",
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

  phaseRow: {
    display: "flex",
    alignItems: "center",
    padding: "var(--space-1) 0",
    borderBottom: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  phaseName: {
    flex: 1,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  phaseTime: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-primary)",
    minWidth: "42px",
    textAlign: "right",
  } as React.CSSProperties,

  phaseTimeEmpty: {
    color: "var(--color-text-muted)",
  } as React.CSSProperties,

  phasePercent: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text-muted)",
    minWidth: "28px",
    textAlign: "right",
    marginLeft: "var(--space-1)",
  } as React.CSSProperties,

  progressContainer: {
    width: "40px",
    height: "3px",
    backgroundColor: "var(--color-border)",
    borderRadius: "2px",
    marginLeft: "var(--space-2)",
    overflow: "hidden",
  } as React.CSSProperties,

  progressBar: {
    height: "100%",
    backgroundColor: "var(--color-ready)",
    borderRadius: "2px",
    transition: "width var(--transition-normal)",
  } as React.CSSProperties,

  deltaContainer: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-xs)",
    minWidth: "36px",
    textAlign: "right",
    marginLeft: "var(--space-1)",
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
    padding: "var(--space-1) 0",
    marginTop: "var(--space-1)",
    borderTop: "1px solid var(--color-border-subtle)",
  } as React.CSSProperties,

  summaryLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--color-text-secondary)",
  } as React.CSSProperties,

  summaryValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--text-sm)",
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
  // Calculate delta from average
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
  // Sort phases by order
  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.order - b.order),
    [phases],
  );

  // Compute phase durations
  const phaseDurations = useMemo(() => {
    if (!capture) return {};
    return computePhaseDurations({
      definitions: phases,
      capture,
      endTimestampMs: totalDurationMs ?? undefined,
    });
  }, [phases, capture, totalDurationMs]);

  // Calculate percentages
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

  // Calculate total tracked time
  const totalTrackedMs = useMemo(() => {
    return Object.values(phaseDurations).reduce<number>(
      (sum, d) => sum + (d ?? 0),
      0,
    );
  }, [phaseDurations]);

  // Don't render if no phases or no capture
  if (sortedPhases.length === 0 || !capture || capture.phases.length === 0) {
    return null;
  }

  const untrackedMs =
    totalDurationMs != null ? totalDurationMs - totalTrackedMs : 0;
  const hasUntracked = untrackedMs > 100; // >100ms untracked

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle as React.CSSProperties}>
          Split Breakdown
        </span>
        <span style={styles.headerCount}>
          {capture.phases.length}/{sortedPhases.length} phases
        </span>
      </div>

      {/* Phase rows */}
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

      {/* Untracked time (if significant) */}
      {hasUntracked && (
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Untracked</span>
          <span style={{ ...styles.summaryValue, ...styles.untrackedValue }}>
            {formatTime(untrackedMs)}
          </span>
        </div>
      )}

      {/* Total solve time */}
      <div style={styles.summaryRow}>
        <span style={styles.summaryLabel}>Total</span>
        <span style={styles.summaryValue}>{formatTime(totalDurationMs)}</span>
      </div>
    </div>
  );
}

export default SplitBreakdown;
