import { useState, useRef, useEffect } from 'react';
import type { Circuit } from '../shared/types';
import { disconnectTerminal } from './circuitUtils';
import { componentDescription } from './circuitDescription';

export interface EditRecord {
  componentId: string;
  terminalId: string;
}

interface ExperimentProps {
  /** The working copy of the circuit (deep-cloned from reference). */
  workingCircuit: Circuit;
  /** History of edits applied in this session. */
  editLog: EditRecord[];
  /**
   * Called when the learner disconnects a terminal.
   * Receives the updated Circuit (reference not mutated) and the edit record.
   * Parent must update its workingCircuit state with the returned value.
   */
  onApplyEdit: (updatedCircuit: Circuit, edit: EditRecord) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Accessible experiment screen.
 *
 * The learner selects a component and one of its connected terminals,
 * then clicks "Disconnect Terminal". The change is applied to a working
 * copy of the circuit; the reference circuit is never mutated.
 *
 * No drag-and-drop. All interactions use native <select> + <button>.
 *
 * A concise aria-live announcement is made after each disconnect so
 * screen-reader users receive immediate feedback.
 */
export default function Experiment({
  workingCircuit,
  editLog,
  onApplyEdit,
  onContinue,
  onBack,
}: ExperimentProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [selectedTerminalId, setSelectedTerminalId] = useState('');
  const [localAnnouncement, setLocalAnnouncement] = useState('');

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Initialise selectedComponentId to the first component when the list is ready.
  useEffect(() => {
    if (!selectedComponentId && workingCircuit.components.length > 0) {
      setSelectedComponentId(workingCircuit.components[0].id);
    }
  }, [selectedComponentId, workingCircuit.components]);

  // When the selected component changes, reset terminal to the first connected one.
  useEffect(() => {
    const comp = workingCircuit.components.find((c) => c.id === selectedComponentId);
    if (!comp) {
      setSelectedTerminalId('');
      return;
    }
    const connected = comp.terminals.filter((t) => t.nodeId !== null);
    setSelectedTerminalId(connected.length > 0 ? connected[0].terminalId : '');
  }, [selectedComponentId, workingCircuit.components]);

  const selectedComp = workingCircuit.components.find((c) => c.id === selectedComponentId);
  const connectableTerminals = selectedComp
    ? selectedComp.terminals.filter((t) => t.nodeId !== null)
    : [];

  const canDisconnect = connectableTerminals.length > 0 && Boolean(selectedTerminalId);

  function handleDisconnect() {
    if (!canDisconnect) return;
    const updated = disconnectTerminal(workingCircuit, selectedComponentId, selectedTerminalId);
    const edit: EditRecord = {
      componentId: selectedComponentId,
      terminalId: selectedTerminalId,
    };
    onApplyEdit(updated, edit);
    // Clear the announcement briefly to re-trigger aria-live for identical messages.
    setLocalAnnouncement('');
    requestAnimationFrame(() => {
      setLocalAnnouncement(
        `${selectedComponentId} terminal ${selectedTerminalId} disconnected.`
      );
    });
    // selectedTerminalId will reset via the useEffect above when the component re-renders.
  }

  const currentDesc = selectedComp
    ? componentDescription(workingCircuit, selectedComp.id)
    : '';

  return (
    <section className="student-step" aria-labelledby="experiment-heading">
      <h2
        id="experiment-heading"
        ref={headingRef}
        tabIndex={-1}
        className="student-step-heading"
      >
        Experiment: Modify the Circuit
      </h2>

      <p className="student-instructions">
        Select a component and one of its connected terminals, then click
        "Disconnect Terminal". The original approved circuit is preserved.
        Your changes are applied to a working copy.
      </p>

      {/* Concise aria-live region for disconnect confirmations */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="student-sr-announcement"
      >
        {localAnnouncement}
      </div>

      {/* ── Component selector ─────────────────────────────────── */}
      <div className="student-form-group">
        <label htmlFor="experiment-component-select" className="student-label">
          Select component
        </label>
        <select
          id="experiment-component-select"
          className="student-select"
          value={selectedComponentId}
          onChange={(e) => setSelectedComponentId(e.target.value)}
        >
          {workingCircuit.components.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.id} —{' '}
              {comp.kind === 'resistor'
                ? `Resistor ${comp.resistanceOhms} Ω`
                : `Voltage source ${comp.voltageVolts} V`}
            </option>
          ))}
        </select>
      </div>

      {/* Component detail preview */}
      {currentDesc && (
        <div className="student-component-preview" aria-label={`${selectedComponentId} details`}>
          <p className="student-description">{currentDesc}</p>
        </div>
      )}

      {/* ── Terminal selector ───────────────────────────────────── */}
      <div className="student-form-group">
        <label htmlFor="experiment-terminal-select" className="student-label">
          Select terminal to disconnect
        </label>

        {connectableTerminals.length > 0 ? (
          <select
            id="experiment-terminal-select"
            className="student-select"
            value={selectedTerminalId}
            onChange={(e) => setSelectedTerminalId(e.target.value)}
          >
            {connectableTerminals.map((t) => (
              <option key={t.terminalId} value={t.terminalId}>
                Terminal {t.terminalId} → currently connected to Node {t.nodeId}
              </option>
            ))}
          </select>
        ) : (
          <p className="student-note" role="note">
            All terminals of{' '}
            <strong>{selectedComponentId || 'this component'}</strong> are already
            disconnected.
          </p>
        )}
      </div>

      {/* ── Disconnect action ───────────────────────────────────── */}
      <div className="student-actions">
        <button
          id="experiment-disconnect-btn"
          type="button"
          className="student-btn student-btn--danger"
          onClick={handleDisconnect}
          disabled={!canDisconnect}
          aria-disabled={!canDisconnect}
        >
          Disconnect Terminal
        </button>
      </div>

      {/* ── Applied changes log ─────────────────────────────────── */}
      {editLog.length > 0 && (
        <div className="student-section student-edit-log">
          <h3>Applied Changes</h3>
          <ul className="student-item-list" aria-label="Applied changes">
            {editLog.map((edit, idx) => (
              <li key={idx}>
                {edit.componentId} terminal {edit.terminalId} disconnected.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <div className="student-actions">
        <button
          type="button"
          id="experiment-back-btn"
          className="student-btn student-btn--ghost"
          onClick={onBack}
        >
          Back to Prediction
        </button>
        <button
          type="button"
          id="experiment-continue-btn"
          className="student-btn student-btn--primary"
          onClick={onContinue}
          disabled={editLog.length === 0}
          aria-disabled={editLog.length === 0}
          aria-describedby={editLog.length === 0 ? 'experiment-continue-note' : undefined}
        >
          Continue to Results
        </button>
      </div>

      {editLog.length === 0 && (
        <p id="experiment-continue-note" className="student-note">
          Disconnect at least one terminal before continuing.
        </p>
      )}
    </section>
  );
}
