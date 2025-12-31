import {
  DurationMs,
  SolveId,
  SplitCapture,
  SplitInstance,
  SplitPhaseDefinition,
} from "./types";

export interface PhaseValidationIssue {
  phase: string;
  message: string;
}

export interface SplitValidationResult {
  ok: boolean;
  issues: PhaseValidationIssue[];
}

/**
 * Normalize and validate phase definitions.
 * - Trims names.
 * - Removes empty names.
 * - Sorts by order (ascending).
 * - Ensures unique names and strictly increasing order.
 */
export function normalizePhaseDefinitions(phases: SplitPhaseDefinition[]): {
  normalized: SplitPhaseDefinition[];
  issues: PhaseValidationIssue[];
} {
  const issues: PhaseValidationIssue[] = [];
  const cleaned = phases
    .map((p) => ({ ...p, name: p.name.trim() }))
    .filter((p) => p.name.length > 0);

  const byOrder = [...cleaned].sort((a, b) => a.order - b.order);

  const seenNames = new Set<string>();
  let lastOrder = -Infinity;

  for (const p of byOrder) {
    if (seenNames.has(p.name)) {
      issues.push({ phase: p.name, message: "Duplicate phase name" });
    } else {
      seenNames.add(p.name);
    }
    if (p.order <= lastOrder) {
      issues.push({
        phase: p.name,
        message: "Order must be strictly increasing",
      });
    }
    lastOrder = p.order;
  }

  return { normalized: byOrder, issues };
}

/**
 * Validate that a set of split instances conforms to the phase definition:
 * - Phases exist in definitions.
 * - Timestamps are non-decreasing by phase order.
 */
export function validateSplitInstances(
  definitions: SplitPhaseDefinition[],
  instances: SplitInstance[],
): SplitValidationResult {
  const issues: PhaseValidationIssue[] = [];
  const defOrder = new Map(definitions.map((d) => [d.name, d.order]));

  const sortedDefs = [...definitions].sort((a, b) => a.order - b.order);
  const nameToIndex = new Map(sortedDefs.map((d, i) => [d.name, i]));

  let lastIndex = -1;
  let lastTs = -Infinity;

  for (const inst of instances) {
    if (!defOrder.has(inst.phase)) {
      issues.push({ phase: inst.phase, message: "Phase not defined" });
      continue;
    }
    const idx = nameToIndex.get(inst.phase)!;
    if (idx < lastIndex) {
      issues.push({
        phase: inst.phase,
        message: "Phase out of order",
      });
    }
    if (inst.timestampMs < lastTs) {
      issues.push({
        phase: inst.phase,
        message: "Timestamps must be non-decreasing",
      });
    }
    lastIndex = idx;
    lastTs = inst.timestampMs;
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Build a SplitCapture from a mapping of phase -> timestamp.
 */
export function buildSplitCapture(
  solveId: SolveId,
  definitions: SplitPhaseDefinition[],
  timestamps: Record<string, DurationMs>,
): SplitCapture {
  const { normalized } = normalizePhaseDefinitions(definitions);
  const phases: SplitInstance[] = normalized
    .filter((d) => timestamps[d.name] != null)
    .map((d) => ({ phase: d.name, timestampMs: timestamps[d.name]! }));

  return { solveId, phases };
}

/**
 * Append a phase timestamp, enforcing definition order.
 */
export function appendPhaseTimestamp(
  capture: SplitCapture,
  definitions: SplitPhaseDefinition[],
  phase: string,
  timestampMs: DurationMs,
): SplitCapture {
  const { normalized } = normalizePhaseDefinitions(definitions);
  const order = new Map(normalized.map((d) => [d.name, d.order]));

  if (!order.has(phase)) return capture;

  const existing = capture.phases.find((p) => p.phase === phase);
  if (existing) {
    // Replace if newer timestamp
    if (timestampMs >= existing.timestampMs) {
      return {
        ...capture,
        phases: capture.phases.map((p) =>
          p.phase === phase ? { ...p, timestampMs } : p,
        ),
      };
    }
    return capture;
  }

  // Insert maintaining order
  const newPhases = [...capture.phases, { phase, timestampMs }];
  newPhases.sort((a, b) => order.get(a.phase)! - order.get(b.phase)!);
  return { ...capture, phases: newPhases };
}

/**
 * Compute per-phase durations from timestamps.
 * Optionally provide a final end timestamp to compute the last segment.
 */
export function computePhaseDurations(options: {
  definitions: SplitPhaseDefinition[];
  capture: SplitCapture;
  endTimestampMs?: DurationMs;
}): Record<string, DurationMs | null> {
  const { definitions, capture, endTimestampMs } = options;
  const order = new Map(
    [...definitions]
      .sort((a, b) => a.order - b.order)
      .map((d, i) => [d.name, i]),
  );
  const sortedInstances = [...capture.phases].sort(
    (a, b) => (order.get(a.phase) ?? 0) - (order.get(b.phase) ?? 0),
  );

  const durations: Record<string, DurationMs | null> = {};
  for (let i = 0; i < sortedInstances.length; i++) {
    const current = sortedInstances[i];
    if (!current) continue;
    const next = sortedInstances[i + 1];
    const end = next?.timestampMs ?? endTimestampMs;
    durations[current.phase] =
      end != null && end >= current.timestampMs
        ? end - current.timestampMs
        : null;
  }
  return durations;
}

/**
 * Merge/replace a capture for a solve within a list.
 */
export function upsertCapture(
  captures: SplitCapture[],
  capture: SplitCapture,
): SplitCapture[] {
  const idx = captures.findIndex((c) => c.solveId === capture.solveId);
  if (idx === -1) return [...captures, capture];
  const next = [...captures];
  next[idx] = capture;
  return next;
}
