/**
 * TimerDisplay: Central time display with state-based colors.
 * Uses tight kerning, tabular nums, and optically-centered decimal.
 */

import React, { useMemo, useEffect, useState } from "react";
import { TimingState, Penalty, DurationMs } from "../../types";

export interface TimerDisplayProps {
  status: TimingState;
  displayTime: DurationMs;
  inspectionRemaining: number | null;
  penalty: Penalty;
  isHolding: boolean;
  isReady: boolean;
  isPB?: boolean;
}

interface FormattedTime {
  main: string;
  decimal: string;
  hasMinutes: boolean;
}

function formatTime(ms: DurationMs): FormattedTime {
  if (ms < 0) ms = 0;

  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const decimalStr = centiseconds.toString().padStart(2, "0");

  if (minutes > 0) {
    const secStr = seconds.toString().padStart(2, "0");
    return {
      main: `${minutes}:${secStr}`,
      decimal: decimalStr,
      hasMinutes: true,
    };
  }

  return {
    main: seconds.toString(),
    decimal: decimalStr,
    hasMinutes: false,
  };
}

function getTimerColor(
  status: TimingState,
  penalty: Penalty,
  isHolding: boolean,
  isReady: boolean,
  inspectionRemaining: number | null,
): string {
  if (isHolding) {
    return isReady
      ? "var(--timer-holding-ready)"
      : "var(--timer-holding-not-ready)";
  }

  switch (status) {
    case "idle":
      return "var(--timer-idle)";

    case "inspection":
      if (inspectionRemaining !== null && inspectionRemaining <= 3) {
        return "var(--timer-inspection-critical)";
      }
      return "var(--timer-inspection)";

    case "running":
      return "var(--timer-running)";

    case "stopped":
      if (penalty === Penalty.DNF) {
        return "var(--timer-stopped-dnf)";
      }
      if (penalty === Penalty.Plus2) {
        return "var(--timer-stopped-plus2)";
      }
      return "var(--timer-stopped)";

    default:
      return "var(--timer-idle)";
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    WebkitUserSelect: "none",
    padding: "var(--space-3)",
  } as React.CSSProperties,

  timeWrapper: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    lineHeight: "var(--timer-line-height)",
  } as React.CSSProperties,

  mainDigits: {
    fontFamily: "var(--font-mono)",
    fontSize: "var(--timer-font-size)",
    fontWeight: "var(--timer-font-weight)",
    fontVariantNumeric: "tabular-nums slashed-zero",
    fontFeatureSettings: '"tnum" 1, "zero" 1, "kern" 1',
    letterSpacing: "var(--timer-letter-spacing)",
    lineHeight: "var(--timer-line-height)",
    transition: "color var(--transition-fast)",
  } as React.CSSProperties,

  decimalPoint: {
    fontFamily: "var(--font-mono)",
    fontSize: "calc(var(--timer-font-size) * 0.85)",
    fontWeight: "var(--timer-font-weight)",
    fontVariantNumeric: "tabular-nums",
    opacity: 0.8,
    margin: "0 -0.04em",
    display: "inline-block",
    transform: "translateY(-0.03em)",
    transition: "color var(--transition-fast)",
  } as React.CSSProperties,

  decimalDigits: {
    fontFamily: "var(--font-mono)",
    fontSize: "calc(var(--timer-font-size) * 0.85)",
    fontWeight: "var(--timer-font-weight)",
    fontVariantNumeric: "tabular-nums slashed-zero",
    fontFeatureSettings: '"tnum" 1, "zero" 1',
    letterSpacing: "-0.02em",
    lineHeight: "var(--timer-line-height)",
    opacity: 0.8,
    transition: "color var(--transition-fast)",
  } as React.CSSProperties,

  penaltyBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(1rem, 3vw, 2rem)",
    fontWeight: 600,
    marginTop: "var(--space-1)",
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  hint: {
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-sm)",
    fontWeight: 400,
    color: "var(--color-text-muted)",
    marginTop: "var(--space-5)",
    textAlign: "center",
    letterSpacing: "0.01em",
  } as React.CSSProperties,

  pbIndicator: {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    fontFamily: "var(--font-ui)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--color-pb)",
    marginTop: "var(--space-2)",
    padding: "var(--space-1) var(--space-2)",
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderRadius: "var(--border-radius-md)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  } as React.CSSProperties,
};

export function TimerDisplay({
  status,
  displayTime,
  inspectionRemaining,
  penalty,
  isHolding,
  isReady,
  isPB = false,
}: TimerDisplayProps) {
  const [justStopped, setJustStopped] = useState(false);

  useEffect(() => {
    if (status === "stopped") {
      setJustStopped(true);
      const timer = setTimeout(() => setJustStopped(false), 60);
      return () => clearTimeout(timer);
    }
    setJustStopped(false);
  }, [status]);

  const displayContent = useMemo(() => {
    if (status === "inspection" && inspectionRemaining !== null) {
      if (inspectionRemaining <= 0) {
        return { main: "+2", decimal: "", isCountdown: true };
      }
      return {
        main: inspectionRemaining.toString(),
        decimal: "",
        isCountdown: true,
      };
    }

    if (status === "idle" || (isHolding && status !== "running")) {
      return { main: "0", decimal: "00", isCountdown: false };
    }

    const formatted = formatTime(displayTime);
    return {
      main: formatted.main,
      decimal: formatted.decimal,
      isCountdown: false,
    };
  }, [status, displayTime, inspectionRemaining, isHolding]);

  const color = getTimerColor(
    status,
    penalty,
    isHolding,
    isReady,
    inspectionRemaining,
  );

  const penaltySuffix = useMemo(() => {
    if (status !== "stopped") return null;
    if (penalty === Penalty.Plus2) return "+2";
    if (penalty === Penalty.DNF) return "DNF";
    return null;
  }, [status, penalty]);

  const penaltyColor =
    penalty === Penalty.DNF
      ? "var(--color-error)"
      : penalty === Penalty.Plus2
        ? "var(--color-warn)"
        : color;

  const hintText = useMemo(() => {
    if (status === "idle" && !isHolding) {
      return "Hold space to start";
    }
    if (status === "inspection") {
      return "Release to begin";
    }
    return null;
  }, [status, isHolding]);

  const containerClassName = justStopped ? "timer-settle" : "";

  return (
    <div
      style={styles.container}
      className={containerClassName}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Timer: ${displayContent.main}${displayContent.decimal ? "." + displayContent.decimal : ""} seconds`}
    >
      <div style={styles.timeWrapper}>
        <span
          style={{
            ...styles.mainDigits,
            color,
          }}
          className="timer-digits"
        >
          {displayContent.main}
        </span>

        {!displayContent.isCountdown && displayContent.decimal && (
          <>
            <span
              style={{
                ...styles.decimalPoint,
                color,
              }}
              className="timer-decimal"
            >
              .
            </span>
            <span
              style={{
                ...styles.decimalDigits,
                color,
              }}
              className="timer-decimal-digits"
            >
              {displayContent.decimal}
            </span>
          </>
        )}
      </div>

      {penaltySuffix && (
        <div
          style={{
            ...styles.penaltyBadge,
            color: penaltyColor,
          }}
          aria-label={`Penalty: ${penaltySuffix}`}
        >
          {penaltySuffix}
        </div>
      )}

      {isPB && status === "stopped" && penalty === Penalty.None && (
        <div style={styles.pbIndicator}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span>Personal Best</span>
        </div>
      )}

      {hintText && (
        <div style={styles.hint as React.CSSProperties}>{hintText}</div>
      )}
    </div>
  );
}

export default TimerDisplay;
