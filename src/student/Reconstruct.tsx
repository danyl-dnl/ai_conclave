import { useState, useRef, useEffect } from 'react';
import type { Circuit, CircuitComponent, TerminalConnection } from '../shared/types';

// ─── Local draft types (reconstruction UI state only) ─────────────────────────

interface DraftNode {
  /** User-chosen label — becomes the nodeId in the output Circuit. */
  id: string;
}

interface DraftTerminal {
  terminalId: string;
  nodeId: string | null; // null = disconnected / unassigned
}

interface DraftComponent {
  /** Stable React key — never shown to the user. */
  draftKey: string;
  kind: 'resistor' | 'voltage-source';
  id: string;
  /** Stored as a string so the input field is controlled without parsing mid-edit. */
  resistanceOhms: string;
  voltageVolts: string;
  terminals: DraftTerminal[];
}

function defaultTerminals(kind: 'resistor' | 'voltage-source'): DraftTerminal[] {
  if (kind === 'resistor') {
    return [
      { terminalId: 'A', nodeId: null },
      { terminalId: 'B', nodeId: null },
    ];
  }
  // voltage-source: terminals[0] = positive, terminals[1] = negative
  return [
    { terminalId: 'positive', nodeId: null },
    { terminalId: 'negative', nodeId: null },
  ];
}

function terminalDisplayLabel(
  kind: 'resistor' | 'voltage-source',
  terminalId: string
): string {
  if (kind === 'voltage-source') {
    return terminalId === 'positive' ? 'Positive terminal' : 'Negative terminal';
  }
  return `Terminal ${terminalId}`;
}

// ─── Component props ──────────────────────────────────────────────────────────

interface ReconstructProps {
  /**
   * The reference circuit — used only to show counts/kinds as a hint.
   * The learner is NOT required to reuse reference node IDs (A, B, …).
   */
  referenceCircuit: Circuit;
  /**
   * Called with a canonical Circuit when the learner submits.
   * Developer 4's verifier decides equivalence; this component does not.
   */
  onSubmit: (circuit: Circuit) => void;
  onBack: () => void;
}

/**
 * Structured circuit reconstruction UI.
 *
 * The learner:
 *   1. Creates electrical nodes with arbitrary labels (e.g. X, Y — not forced to A, B).
 *   2. Adds components (resistor or voltage source) with user-chosen IDs and values.
 *   3. Assigns each terminal to one of the created nodes (or leaves it disconnected).
 *   4. Submits — the output is a canonical Circuit passed to the parent.
 *
 * No drag-and-drop. All interactions use native inputs, selects, and buttons.
 * The verifier (Developer 4) decides whether the result is structurally equivalent.
 */
export default function Reconstruct({
  referenceCircuit,
  onSubmit,
  onBack,
}: ReconstructProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<DraftNode[]>([]);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [nodeError, setNodeError] = useState('');

  const [components, setComponents] = useState<DraftComponent[]>([]);
  const [draftCounter, setDraftCounter] = useState(0);

  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // ── Node management ────────────────────────────────────────────────────────

  function addNode() {
    const label = newNodeLabel.trim();
    if (!label) {
      setNodeError('Node label cannot be empty.');
      return;
    }
    if (nodes.some((n) => n.id === label)) {
      setNodeError(`A node with label "${label}" already exists.`);
      return;
    }
    setNodeError('');
    setNodes((prev) => [...prev, { id: label }]);
    setNewNodeLabel('');
  }

  function removeNode(nodeId: string) {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    // Unassign any terminal that referenced this node.
    setComponents((prev) =>
      prev.map((comp) => ({
        ...comp,
        terminals: comp.terminals.map((t) =>
          t.nodeId === nodeId ? { ...t, nodeId: null } : t
        ),
      }))
    );
  }

  // ── Component management ───────────────────────────────────────────────────

  function addComponent(kind: 'resistor' | 'voltage-source') {
    const key = String(draftCounter);
    setDraftCounter((k) => k + 1);
    setComponents((prev) => [
      ...prev,
      {
        draftKey: key,
        kind,
        id: '',
        resistanceOhms: '',
        voltageVolts: '',
        terminals: defaultTerminals(kind),
      },
    ]);
  }

  function removeComponent(draftKey: string) {
    setComponents((prev) => prev.filter((c) => c.draftKey !== draftKey));
  }

  function updateField(
    draftKey: string,
    field: 'id' | 'resistanceOhms' | 'voltageVolts',
    value: string
  ) {
    setComponents((prev) =>
      prev.map((c) => (c.draftKey === draftKey ? { ...c, [field]: value } : c))
    );
  }

  function updateTerminal(
    draftKey: string,
    terminalId: string,
    nodeId: string | null
  ) {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.draftKey !== draftKey) return c;
        return {
          ...c,
          terminals: c.terminals.map((t) =>
            t.terminalId === terminalId ? { ...t, nodeId } : t
          ),
        };
      })
    );
  }

  // ── Submission ─────────────────────────────────────────────────────────────

  function handleSubmit() {
    const errors: string[] = [];

    if (nodes.length === 0) {
      errors.push('Add at least one electrical node.');
    }
    if (components.length === 0) {
      errors.push('Add at least one component.');
    }

    // Validate component IDs unique and non-empty.
    const seenIds = new Set<string>();
    for (const comp of components) {
      const trimmedId = comp.id.trim();
      if (!trimmedId) {
        errors.push('A component is missing an ID.');
      } else if (seenIds.has(trimmedId)) {
        errors.push(`Duplicate component ID: "${trimmedId}".`);
      } else {
        seenIds.add(trimmedId);
      }

      if (comp.kind === 'resistor') {
        const r = parseFloat(comp.resistanceOhms);
        if (isNaN(r) || r <= 0) {
          errors.push(
            `${trimmedId || '(unnamed)'}: Resistance must be a positive number in ohms.`
          );
        }
      } else {
        const v = parseFloat(comp.voltageVolts);
        if (isNaN(v)) {
          errors.push(`${trimmedId || '(unnamed)'}: Voltage must be a number.`);
        }
      }
    }

    if (errors.length > 0) {
      setSubmitErrors(errors);
      return;
    }

    setSubmitErrors([]);

    // Build canonical Circuit.
    const circuitNodes = nodes.map((n) => ({ id: n.id, label: n.id }));

    const circuitComponents: CircuitComponent[] = components.map((comp) => {
      const terminals: [TerminalConnection, TerminalConnection] = [
        { terminalId: comp.terminals[0].terminalId, nodeId: comp.terminals[0].nodeId },
        { terminalId: comp.terminals[1].terminalId, nodeId: comp.terminals[1].nodeId },
      ];

      if (comp.kind === 'resistor') {
        return {
          kind: 'resistor' as const,
          id: comp.id.trim(),
          resistanceOhms: parseFloat(comp.resistanceOhms),
          terminals,
        };
      } else {
        return {
          kind: 'voltage-source' as const,
          id: comp.id.trim(),
          voltageVolts: parseFloat(comp.voltageVolts),
          terminals,
        };
      }
    });

    const circuit: Circuit = {
      id: `student-reconstruction-${Date.now()}`,
      label: 'Student Reconstruction',
      nodes: circuitNodes,
      components: circuitComponents,
    };

    onSubmit(circuit);
  }

  // ── Node options for terminal <select> elements ────────────────────────────

  const nodeOptions = (
    <>
      <option value="">— Disconnected —</option>
      {nodes.map((n) => (
        <option key={n.id} value={n.id}>
          {n.id}
        </option>
      ))}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="student-step" aria-labelledby="reconstruct-heading">
      <h2
        id="reconstruct-heading"
        ref={headingRef}
        tabIndex={-1}
        className="student-step-heading"
      >
        Reconstruct the Circuit
      </h2>

      <p className="student-instructions">
        Build your reconstruction using the controls below. Create your own node
        labels — you do not need to use the original node names. Assign terminals
        to nodes. The structural verifier will compare connectivity, not node names.
      </p>

      <p className="student-note">
        Reference circuit: {referenceCircuit.label} — {referenceCircuit.nodes.length}{' '}
        node{referenceCircuit.nodes.length !== 1 ? 's' : ''},{' '}
        {referenceCircuit.components.length} component
        {referenceCircuit.components.length !== 1 ? 's' : ''}.
      </p>

      {/* ── Section 1: Nodes ───────────────────────────────────── */}
      <fieldset className="student-fieldset">
        <legend>Electrical Nodes</legend>

        {nodes.length > 0 ? (
          <ul className="student-item-list" aria-label="Created nodes">
            {nodes.map((n) => (
              <li key={n.id} className="student-node-item">
                <span className="student-item-label">Node: {n.id}</span>
                <button
                  type="button"
                  className="student-btn student-btn--danger-sm"
                  onClick={() => removeNode(n.id)}
                  aria-label={`Remove node ${n.id}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="student-note">No nodes created yet.</p>
        )}

        <div className="student-add-row">
          <label htmlFor="reconstruct-new-node" className="student-label">
            New node label (e.g. X, Y, Node1)
          </label>
          <div className="student-inline-form">
            <input
              id="reconstruct-new-node"
              type="text"
              className="student-input"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addNode();
                }
              }}
              placeholder="e.g. X"
              aria-describedby={nodeError ? 'reconstruct-node-error' : undefined}
            />
            <button
              id="reconstruct-add-node-btn"
              type="button"
              className="student-btn student-btn--secondary"
              onClick={addNode}
            >
              Add Node
            </button>
          </div>

          {nodeError && (
            <p id="reconstruct-node-error" role="alert" className="student-error">
              {nodeError}
            </p>
          )}
        </div>
      </fieldset>

      {/* ── Section 2: Components ──────────────────────────────── */}
      <fieldset className="student-fieldset">
        <legend>Components</legend>

        {components.length > 0 ? (
          <ul
            className="student-component-list"
            aria-label="Reconstruction components"
          >
            {components.map((comp) => (
              <li key={comp.draftKey} className="student-component-card">
                {/* Header */}
                <div className="student-component-header">
                  <span className="student-kind-badge">
                    {comp.kind === 'resistor' ? 'Resistor' : 'Voltage Source'}
                  </span>
                  <button
                    type="button"
                    className="student-btn student-btn--danger-sm"
                    onClick={() => removeComponent(comp.draftKey)}
                    aria-label={`Remove component ${comp.id || '(unnamed)'}`}
                  >
                    Remove
                  </button>
                </div>

                {/* Fields */}
                <div className="student-form-row">
                  <div className="student-form-group student-form-group--inline">
                    <label
                      htmlFor={`reconstruct-id-${comp.draftKey}`}
                      className="student-label"
                    >
                      Component ID
                    </label>
                    <input
                      id={`reconstruct-id-${comp.draftKey}`}
                      type="text"
                      className="student-input"
                      value={comp.id}
                      onChange={(e) =>
                        updateField(comp.draftKey, 'id', e.target.value)
                      }
                      placeholder={
                        comp.kind === 'resistor' ? 'e.g. R1' : 'e.g. V1'
                      }
                      aria-label="Component ID"
                    />
                  </div>

                  {comp.kind === 'resistor' ? (
                    <div className="student-form-group student-form-group--inline">
                      <label
                        htmlFor={`reconstruct-r-${comp.draftKey}`}
                        className="student-label"
                      >
                        Resistance (ohms)
                      </label>
                      <input
                        id={`reconstruct-r-${comp.draftKey}`}
                        type="number"
                        min="0"
                        step="any"
                        className="student-input"
                        value={comp.resistanceOhms}
                        onChange={(e) =>
                          updateField(
                            comp.draftKey,
                            'resistanceOhms',
                            e.target.value
                          )
                        }
                        placeholder="e.g. 100"
                        aria-label="Resistance in ohms"
                      />
                    </div>
                  ) : (
                    <div className="student-form-group student-form-group--inline">
                      <label
                        htmlFor={`reconstruct-v-${comp.draftKey}`}
                        className="student-label"
                      >
                        Voltage (volts)
                      </label>
                      <input
                        id={`reconstruct-v-${comp.draftKey}`}
                        type="number"
                        step="any"
                        className="student-input"
                        value={comp.voltageVolts}
                        onChange={(e) =>
                          updateField(
                            comp.draftKey,
                            'voltageVolts',
                            e.target.value
                          )
                        }
                        placeholder="e.g. 6"
                        aria-label="Voltage in volts"
                      />
                    </div>
                  )}
                </div>

                {/* Terminal assignments */}
                <div className="student-terminals">
                  <h4>Terminal Assignments</h4>
                  {comp.terminals.map((t) => (
                    <div
                      key={t.terminalId}
                      className="student-form-group student-form-group--inline"
                    >
                      <label
                        htmlFor={`reconstruct-t-${comp.draftKey}-${t.terminalId}`}
                        className="student-label"
                      >
                        {terminalDisplayLabel(comp.kind, t.terminalId)}
                      </label>
                      <select
                        id={`reconstruct-t-${comp.draftKey}-${t.terminalId}`}
                        className="student-select"
                        value={t.nodeId ?? ''}
                        onChange={(e) =>
                          updateTerminal(
                            comp.draftKey,
                            t.terminalId,
                            e.target.value === '' ? null : e.target.value
                          )
                        }
                      >
                        {nodeOptions}
                      </select>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="student-note">No components added yet.</p>
        )}

        <div className="student-add-row">
          <span className="student-label" id="add-component-label">
            Add component:
          </span>
          <div
            className="student-actions student-actions--inline"
            aria-labelledby="add-component-label"
          >
            <button
              id="reconstruct-add-resistor-btn"
              type="button"
              className="student-btn student-btn--secondary"
              onClick={() => addComponent('resistor')}
            >
              + Resistor
            </button>
            <button
              id="reconstruct-add-voltage-source-btn"
              type="button"
              className="student-btn student-btn--secondary"
              onClick={() => addComponent('voltage-source')}
            >
              + Voltage Source
            </button>
          </div>
        </div>
      </fieldset>

      {/* ── Validation errors ──────────────────────────────────── */}
      {submitErrors.length > 0 && (
        <div
          role="alert"
          className="student-error-panel"
          aria-label="Validation errors"
        >
          <p>
            <strong>Please fix the following before submitting:</strong>
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0 0' }}>
            {submitErrors.map((err, i) => (
              <li key={i} className="student-description">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="student-actions">
        <button
          type="button"
          id="reconstruct-back-btn"
          className="student-btn student-btn--ghost"
          onClick={onBack}
        >
          Back to Results
        </button>
        <button
          type="button"
          id="reconstruct-submit-btn"
          className="student-btn student-btn--primary"
          onClick={handleSubmit}
        >
          Submit Reconstruction
        </button>
      </div>
    </section>
  );
}
