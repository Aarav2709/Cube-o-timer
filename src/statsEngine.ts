import {
  DurationMs,
  PersonalBest,
  RollingStats,
  Solve,
  StatWindowResult,
  TimelinePoint,
} from "./types";

type Mode = "mo3" | "trimmed";

interface WindowComputation {
  result: StatWindowResult;
  contributingIndices: number[];
}

function sortSolvesChronologically(solves: Solve[]): Solve[] {
  return [...solves].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function extractDurations(solves: Solve[]): (DurationMs | null)[] {
  return solves.map((s) => s.timing.finalDurationMs);
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeMeanOf3Window(
  durations: (DurationMs | null)[],
  start: number,
): WindowComputation {
  const slice = durations.slice(start, start + 3);
  const indices = [start, start + 1, start + 2];
  const hasDnf = slice.some((v) => v == null);
  const valueMs = hasDnf ? null : average(slice as number[]);
  return {
    result: {
      size: 3,
      valueMs,
      indices,
      isDnf: hasDnf,
    },
    contributingIndices: hasDnf ? [] : indices,
  };
}

function computeTrimmedAverageWindow(
  durations: (DurationMs | null)[],
  start: number,
  size: number,
): WindowComputation {
  const window = durations.slice(start, start + size).map((v, i) => ({
    value: v ?? Number.POSITIVE_INFINITY,
    idx: start + i,
  }));

  // Sort to remove best (smallest) and worst (largest)
  const sorted = [...window].sort((a, b) => a.value - b.value);
  const contributing = sorted.slice(1, sorted.length - 1);
  const hasDnf = contributing.some((c) => !Number.isFinite(c.value));
  const valueMs = hasDnf ? null : average(contributing.map((c) => c.value));

  return {
    result: {
      size,
      valueMs,
      indices: contributing.map((c) => c.idx),
      isDnf: hasDnf,
    },
    contributingIndices: contributing.map((c) => c.idx),
  };
}

function computeWindowAt(
  durations: (DurationMs | null)[],
  start: number,
  mode: Mode,
  size: number,
): WindowComputation {
  if (mode === "mo3") return computeMeanOf3Window(durations, start);
  return computeTrimmedAverageWindow(durations, start, size);
}

function latestWindow(
  durations: (DurationMs | null)[],
  mode: Mode,
  size: number,
): StatWindowResult | null {
  if (durations.length < size) return null;
  const start = durations.length - size;
  return computeWindowAt(durations, start, mode, size).result;
}

function bestWindow(
  durations: (DurationMs | null)[],
  mode: Mode,
  size: number,
): WindowComputation | null {
  if (durations.length < size) return null;
  let best: WindowComputation | null = null;
  for (let start = 0; start <= durations.length - size; start++) {
    const comp = computeWindowAt(durations, start, mode, size);
    if (comp.result.valueMs == null) continue;
    if (
      !best ||
      (best.result.valueMs as number) > (comp.result.valueMs as number)
    ) {
      best = comp;
    }
  }
  return best;
}

function computeAo5Series(
  durations: (DurationMs | null)[],
): StatWindowResult[] {
  const results: StatWindowResult[] = [];
  if (durations.length < 5) return results;
  for (let start = 0; start <= durations.length - 5; start++) {
    results.push(computeTrimmedAverageWindow(durations, start, 5).result);
  }
  return results;
}

function computeMoXAo5(
  ao5Series: StatWindowResult[],
  x: number,
): StatWindowResult | null {
  if (ao5Series.length < x || x <= 0) return null;
  const start = ao5Series.length - x;
  const slice = ao5Series.slice(start, start + x);
  const hasDnf = slice.some((r) => r.valueMs == null);
  if (hasDnf) {
    return {
      size: x,
      valueMs: null,
      indices: slice.flatMap((r) => r.indices),
      isDnf: true,
    };
  }
  const valueMs = average(slice.map((r) => r.valueMs as number));
  return {
    size: x,
    valueMs,
    indices: slice.flatMap((r) => r.indices),
    isDnf: false,
  };
}

function buildTimeline(solves: Solve[]): TimelinePoint[] {
  return solves.map((solve, idx) => ({
    solveId: solve.id,
    index: idx,
    finalDurationMs: solve.timing.finalDurationMs,
    penalty: solve.timing.penalty,
    createdAt: solve.createdAt,
  }));
}

function addPbIfBetter(
  list: PersonalBest[],
  type: PersonalBest["type"],
  size: number | undefined,
  valueMs: number,
  solveIds: string[],
  achievedAt: string,
): void {
  const existing = list.find(
    (pb) => pb.type === type && (size === undefined || pb.size === size),
  );
  if (!existing || existing.valueMs > valueMs) {
    const next: PersonalBest = {
      type,
      size,
      valueMs,
      solveIds,
      achievedAt,
    };
    if (existing) {
      const idx = list.indexOf(existing);
      list[idx] = next;
    } else {
      list.push(next);
    }
  }
}

export interface StatsOptions {
  moXAo5?: number;
}

export interface SessionStatsResult {
  rolling: RollingStats;
  timeline: TimelinePoint[];
  personalBests: PersonalBest[];
}

/**
 * Compute per-session statistics (chronological by createdAt).
 */
export function computeSessionStats(
  solvesInput: Solve[],
  options: StatsOptions = {},
): SessionStatsResult {
  const solves = sortSolvesChronologically(solvesInput);
  const durations = extractDurations(solves);
  const timeline = buildTimeline(solves);

  const validDurations = durations.filter((d): d is number => d != null);
  const bestMs = validDurations.length ? Math.min(...validDurations) : null;
  const worstMs = validDurations.length ? Math.max(...validDurations) : null;
  const meanMs = validDurations.length ? average(validDurations) : null;

  const mo3 = latestWindow(durations, "mo3", 3);
  const ao5 = latestWindow(durations, "trimmed", 5);
  const ao12 = latestWindow(durations, "trimmed", 12);
  const ao50 = latestWindow(durations, "trimmed", 50);
  const ao100 = latestWindow(durations, "trimmed", 100);
  const ao1000 = latestWindow(durations, "trimmed", 1000);

  const ao5Series = computeAo5Series(durations);
  const moXAo5Result =
    options.moXAo5 && options.moXAo5 > 0
      ? computeMoXAo5(ao5Series, options.moXAo5)
      : null;

  const rolling: RollingStats = {
    count: durations.length,
    bestMs,
    worstMs,
    meanMs,
    mo3,
    ao5,
    ao12,
    ao50,
    ao100,
    ao1000,
    moXAo5: options.moXAo5
      ? {
          x: options.moXAo5,
          result: moXAo5Result,
        }
      : undefined,
  };

  const personalBests: PersonalBest[] = [];
  if (bestMs != null) {
    const bestIndex = durations.findIndex((d) => d === bestMs);
    const solve = solves[bestIndex];
    if (solve) {
      addPbIfBetter(
        personalBests,
        "single",
        undefined,
        bestMs,
        [solve.id],
        solve.createdAt,
      );
    }
  }

  const mo3Best = bestWindow(durations, "mo3", 3);
  if (
    mo3Best &&
    mo3Best.result.valueMs != null &&
    mo3Best.contributingIndices.length > 0
  ) {
    const lastIndex =
      mo3Best.contributingIndices[mo3Best.contributingIndices.length - 1];
    const lastSolve = lastIndex !== undefined ? solves[lastIndex] : undefined;
    if (lastSolve) {
      addPbIfBetter(
        personalBests,
        "mo3",
        3,
        mo3Best.result.valueMs,
        mo3Best.contributingIndices
          .map((i) => solves[i]?.id)
          .filter((id): id is string => id !== undefined),
        lastSolve.createdAt,
      );
    }
  }

  const ao5Best = bestWindow(durations, "trimmed", 5);
  if (
    ao5Best &&
    ao5Best.result.valueMs != null &&
    ao5Best.contributingIndices.length > 0
  ) {
    const lastIndex =
      ao5Best.contributingIndices[ao5Best.contributingIndices.length - 1];
    const lastSolve = lastIndex !== undefined ? solves[lastIndex] : undefined;
    if (lastSolve) {
      addPbIfBetter(
        personalBests,
        "ao5",
        5,
        ao5Best.result.valueMs,
        ao5Best.contributingIndices
          .map((i) => solves[i]?.id)
          .filter((id): id is string => id !== undefined),
        lastSolve.createdAt,
      );
    }
  }

  const ao12Best = bestWindow(durations, "trimmed", 12);
  if (
    ao12Best &&
    ao12Best.result.valueMs != null &&
    ao12Best.contributingIndices.length > 0
  ) {
    const lastIndex =
      ao12Best.contributingIndices[ao12Best.contributingIndices.length - 1];
    const lastSolve = lastIndex !== undefined ? solves[lastIndex] : undefined;
    if (lastSolve) {
      addPbIfBetter(
        personalBests,
        "ao12",
        12,
        ao12Best.result.valueMs,
        ao12Best.contributingIndices
          .map((i) => solves[i]?.id)
          .filter((id): id is string => id !== undefined),
        lastSolve.createdAt,
      );
    }
  }

  if (
    options.moXAo5 &&
    moXAo5Result &&
    moXAo5Result.valueMs != null &&
    moXAo5Result.indices.length > 0
  ) {
    const lastIndex = moXAo5Result.indices[moXAo5Result.indices.length - 1];
    const lastSolve = lastIndex !== undefined ? solves[lastIndex] : undefined;
    if (lastSolve) {
      addPbIfBetter(
        personalBests,
        "custom",
        options.moXAo5,
        moXAo5Result.valueMs,
        moXAo5Result.indices
          .map((i) => solves[i]?.id)
          .filter((id): id is string => id !== undefined),
        lastSolve.createdAt,
      );
    }
  }

  return { rolling, timeline, personalBests };
}
