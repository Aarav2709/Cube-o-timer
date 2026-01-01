import React, { useCallback, useState, useRef } from "react";
import { SplitPhaseDefinition } from "../../types";

export interface SplitEditorProps {
  phases: SplitPhaseDefinition[];
  onChange: (phases: SplitPhaseDefinition[]) => void;
  disabled?: boolean;
}

const PRESETS: Record<string, SplitPhaseDefinition[]> = {
  CFOP: [
    { name: "Cross", order: 1 },
    { name: "F2L", order: 2 },
    { name: "OLL", order: 3 },
    { name: "PLL", order: 4 },
  ],
  Roux: [
    { name: "FB", order: 1 },
    { name: "SB", order: 2 },
    { name: "CMLL", order: 3 },
    { name: "LSE", order: 4 },
  ],
  ZZ: [
    { name: "EOLine", order: 1 },
    { name: "F2L", order: 2 },
    { name: "LL", order: 3 },
  ],
  Petrus: [
    { name: "2x2x2", order: 1 },
    { name: "2x2x3", order: 2 },
    { name: "EO", order: 3 },
    { name: "F2L", order: 4 },
    { name: "LL", order: 5 },
  ],
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "10px",
    backgroundColor: "var(--color-surface)",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,

  title: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  } as React.CSSProperties,

  presetsContainer: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    alignItems: "center",
  } as React.CSSProperties,

  presetsLabel: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    marginRight: "2px",
  } as React.CSSProperties,

  presetButton: {
    padding: "2px 6px",
    fontSize: "9px",
    fontWeight: 500,
    fontFamily: "var(--font-ui)",
    color: "var(--color-text-secondary)",
    backgroundColor: "var(--color-surface-raised)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 40ms ease-out",
  } as React.CSSProperties,

  presetButtonHover: {
    borderColor: "var(--color-text-muted)",
    color: "var(--color-text-primary)",
  } as React.CSSProperties,

  clearButton: {
    color: "var(--color-error)",
    borderColor: "var(--color-error)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  } as React.CSSProperties,

  phasesList: {
    display: "flex",
    flexDirection: "column",
  } as React.CSSProperties,

  emptyState: {
    textAlign: "center",
    padding: "12px",
    color: "var(--color-text-muted)",
    fontSize: "10px",
  } as React.CSSProperties,

  phaseRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px",
    backgroundColor: "var(--color-surface-raised)",
    borderRadius: "3px",
    marginBottom: "3px",
  } as React.CSSProperties,

  phaseIndex: {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    color: "var(--color-text-muted)",
    minWidth: "14px",
    textAlign: "center",
  } as React.CSSProperties,

  phaseInput: {
    flex: 1,
    padding: "3px 6px",
    fontSize: "11px",
    fontFamily: "var(--font-ui)",
    backgroundColor: "var(--color-void)",
    color: "var(--color-text-primary)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "3px",
    outline: "none",
    transition: "border-color 40ms ease-out",
  } as React.CSSProperties,

  phaseInputFocus: {
    borderColor: "var(--color-focus)",
  } as React.CSSProperties,

  rowButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    padding: 0,
    fontSize: "10px",
    fontFamily: "var(--font-ui)",
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 40ms ease-out",
  } as React.CSSProperties,

  rowButtonDisabled: {
    opacity: 0.3,
    cursor: "not-allowed",
  } as React.CSSProperties,

  removeButton: {
    color: "var(--color-error)",
  } as React.CSSProperties,

  addPhaseContainer: {
    display: "flex",
    gap: "4px",
    marginTop: "2px",
  } as React.CSSProperties,

  addInput: {
    flex: 1,
    padding: "3px 6px",
    fontSize: "11px",
    fontFamily: "var(--font-ui)",
    backgroundColor: "var(--color-void)",
    color: "var(--color-text-primary)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "3px",
    outline: "none",
  } as React.CSSProperties,

  addButton: {
    padding: "3px 10px",
    fontSize: "10px",
    fontWeight: 500,
    fontFamily: "var(--font-ui)",
    color: "var(--color-ready)",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 40ms ease-out",
  } as React.CSSProperties,

  addButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as React.CSSProperties,

  hint: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
    marginTop: "2px",
    textAlign: "center",
  } as React.CSSProperties,

  kbd: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "10px",
    padding: "0 2px",
    fontFamily: "var(--font-mono)",
    fontSize: "8px",
    fontWeight: 500,
    lineHeight: 1.3,
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-surface-raised)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--color-border)",
    borderRadius: "2px",
  } as React.CSSProperties,
};

interface PhaseRowProps {
  phase: SplitPhaseDefinition;
  index: number;
  total: number;
  onNameChange: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

function PhaseRow({
  phase,
  index,
  total,
  onNameChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  disabled = false,
}: PhaseRowProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(e.target.value);
    },
    [onNameChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.code === "Backspace" && phase.name === "") {
        e.preventDefault();
        onRemove();
      }
    },
    [phase.name, onRemove],
  );

  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  return (
    <div style={styles.phaseRow}>
      <span style={styles.phaseIndex as React.CSSProperties}>{index + 1}</span>
      <input
        type="text"
        value={phase.name}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Phase name"
        style={{
          ...styles.phaseInput,
          ...(isFocused ? styles.phaseInputFocus : {}),
        }}
        disabled={disabled}
      />
      <button
        onClick={onMoveUp}
        disabled={disabled || !canMoveUp}
        style={{
          ...styles.rowButton,
          ...(!canMoveUp ? styles.rowButtonDisabled : {}),
        }}
      >
        ↑
      </button>
      <button
        onClick={onMoveDown}
        disabled={disabled || !canMoveDown}
        style={{
          ...styles.rowButton,
          ...(!canMoveDown ? styles.rowButtonDisabled : {}),
        }}
      >
        ↓
      </button>
      <button
        onClick={onRemove}
        disabled={disabled}
        style={{
          ...styles.rowButton,
          ...styles.removeButton,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function SplitEditor({
  phases,
  onChange,
  disabled = false,
}: SplitEditorProps) {
  const [newPhaseName, setNewPhaseName] = useState("");
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const normalizeOrders = useCallback(
    (p: SplitPhaseDefinition[]): SplitPhaseDefinition[] => {
      return p.map((phase, idx) => ({ ...phase, order: idx + 1 }));
    },
    [],
  );

  const handleAddPhase = useCallback(() => {
    if (newPhaseName.trim() === "") return;
    const newPhase: SplitPhaseDefinition = {
      name: newPhaseName.trim(),
      order: phases.length + 1,
    };
    onChange(normalizeOrders([...phases, newPhase]));
    setNewPhaseName("");
    newInputRef.current?.focus();
  }, [newPhaseName, phases, onChange, normalizeOrders]);

  const handleNewPhaseKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.code === "Enter") {
        e.preventDefault();
        handleAddPhase();
      }
    },
    [handleAddPhase],
  );

  const handlePhaseNameChange = useCallback(
    (index: number, name: string) => {
      const updated = phases.map((p, i) => (i === index ? { ...p, name } : p));
      onChange(updated);
    },
    [phases, onChange],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const updated = [...phases];
      const current = updated[index];
      const prev = updated[index - 1];
      if (current && prev) {
        updated[index - 1] = current;
        updated[index] = prev;
        onChange(normalizeOrders(updated));
      }
    },
    [phases, onChange, normalizeOrders],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === phases.length - 1) return;
      const updated = [...phases];
      const current = updated[index];
      const next = updated[index + 1];
      if (current && next) {
        updated[index] = next;
        updated[index + 1] = current;
        onChange(normalizeOrders(updated));
      }
    },
    [phases, onChange, normalizeOrders],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = phases.filter((_, i) => i !== index);
      onChange(normalizeOrders(updated));
    },
    [phases, onChange, normalizeOrders],
  );

  const handlePresetSelect = useCallback(
    (presetName: string) => {
      const preset = PRESETS[presetName];
      if (preset) {
        onChange(normalizeOrders([...preset]));
      }
    },
    [onChange, normalizeOrders],
  );

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const canAdd = newPhaseName.trim() !== "" && !disabled;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title as React.CSSProperties}>Split Phases</span>
      </div>

      <div style={styles.presetsContainer as React.CSSProperties}>
        <span style={styles.presetsLabel}>Presets:</span>
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => handlePresetSelect(name)}
            onMouseEnter={() => setHoveredPreset(name)}
            onMouseLeave={() => setHoveredPreset(null)}
            style={{
              ...styles.presetButton,
              ...(hoveredPreset === name ? styles.presetButtonHover : {}),
            }}
            disabled={disabled}
          >
            {name}
          </button>
        ))}
        {phases.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              ...styles.presetButton,
              ...styles.clearButton,
            }}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      <div style={styles.phasesList as React.CSSProperties}>
        {phases.length === 0 ? (
          <div style={styles.emptyState as React.CSSProperties}>
            No phases. Add below or select a preset.
          </div>
        ) : (
          phases.map((phase, index) => (
            <PhaseRow
              key={`${phase.order}-${index}`}
              phase={phase}
              index={index}
              total={phases.length}
              onNameChange={(name) => handlePhaseNameChange(index, name)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
              onRemove={() => handleRemove(index)}
              disabled={disabled}
            />
          ))
        )}
      </div>

      <div style={styles.addPhaseContainer}>
        <input
          ref={newInputRef}
          type="text"
          value={newPhaseName}
          onChange={(e) => setNewPhaseName(e.target.value)}
          onKeyDown={handleNewPhaseKeyDown}
          placeholder="New phase..."
          style={styles.addInput}
          disabled={disabled}
        />
        <button
          onClick={handleAddPhase}
          style={{
            ...styles.addButton,
            ...(!canAdd ? styles.addButtonDisabled : {}),
          }}
          disabled={!canAdd}
        >
          Add
        </button>
      </div>

      <div style={styles.hint as React.CSSProperties}>
        <span style={styles.kbd}>Enter</span> add ·{" "}
        <span style={styles.kbd}>⌫</span> remove empty
      </div>
    </div>
  );
}

export default SplitEditor;
