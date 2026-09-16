import { useRef, useEffect } from 'react';
import type { Circuit } from '../shared/types';
import type { SimulationResult, SimulateCircuitFn } from './studentTypes';

interface ResultProps {
  /** The learner's original prediction — frozen, never overwritten. */
  prediction: string;
  /** The working circuit after edits (used to label simulation result rows). */
  workingCircuit: Circuit;
  /** null = simulation not yet run. */
  simulationResult: SimulationResult | null;
  /**
   * undefined = Developer 3's simulator is not yet connected.
   * In that case the Continue button is blocked and an integration status
   * message is shown.
   */
  simulateCircuit: SimulateCircuitFn | undefined;
  /** Trigger a simulation run. Parent calls simulateCircuit and updates state. */
  onRequestSimulation: () => void;
  /**
   * Only callable when simulationResult.status === 'success'.
   * Blocked (button disabled + note) in all other cases.
   */
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Result screen: shows the learner's original prediction alongside the
 * simulation output.
 *
 * Progression to Reconstruction is BLOCKED unless simulation has completed
 * successfully. If the simulator is not yet connected, the button is
 * disabled and an integration status message explains why.
 */
export default function Result({
  prediction,
  workingCircuit,
  simulationResult,
  simulateCircuit,
  onRequestSimulation,
  onContinue,
  onBack,
}: ResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const simSuccess =
    simulationResult !== null && simulationResult.status === 'success'
      ? simulationResult
      : null;

  const canContinue = simSuccess !== null;

  return (
    <section className="student-step" aria-labelledby="result-heading">
      <h2
        id="result-heading"
        ref={headingRef}
        tabIndex={-1}
        className="student-step-heading"
      >
        Compare: Prediction vs Result
      </h2>

      {/* ── Original prediction — read-only, frozen ──────────────── */}
      <div
        className="student-compare-panel student-compare-panel--prediction"
        aria-labelledby="original-prediction-heading"
      >
        <h3 id="original-prediction-heading">Your Original Prediction</h3>
        <blockquote className="student-prediction-text">{prediction}</blockquote>
      </div>

      {/* ── Observed result ──────────────────────────────────────── */}
      <div
        className="student-compare-panel"
        aria-labelledby="observed-result-heading"
      >
        <h3 id="observed-result-heading">Observed Result</h3>

        {simulateCircuit === undefined ? (
          /* Simulator not connected */
          <div className="student-integration-status" role="note">
            <p>
              <strong>Integration status:</strong> The simulation module is not yet
              connected to this activity.
            </p>
            <p>
              A successful simulation is required before you can proceed to
              Reconstruction. Please contact the integration owner to connect
              Developer 3's simulator.
            </p>
          </div>
        ) : simulationResult === null ? (
          /* Connected, but not yet run */
          <div>
            <p className="student-instructions">
              The simulation has not been run yet. Click the button below to
              simulate the modified circuit.
            </p>
            <button
              id="result-run-simulation-btn"
              type="button"
              className="student-btn student-btn--primary"
              onClick={onRequestSimulation}
            >
              Run Simulation
            </button>
          </div>
        ) : simulationResult.status === 'error' ? (
          /* Simulation error */
          <div>
            <div
              id="result-simulation-error"
              role="alert"
              className="student-error-panel"
              aria-label="Simulation error"
            >
              <p>
                <strong>Simulation error:</strong>
              </p>
              <p>{simulationResult.message}</p>
              {simulationResult.code !== undefined && (
                <p className="student-note">Error code: {simulationResult.code}</p>
              )}
            </div>
            <button
              type="button"
              className="student-btn student-btn--secondary"
              onClick={onRequestSimulation}
              style={{ marginTop: '0.75rem' }}
            >
              Retry Simulation
            </button>
          </div>
        ) : (
          /* Simulation success */
          <div className="student-simulation-results">
            <h4>Component Currents</h4>
            <table
              className="student-results-table"
              aria-label="Component currents from simulation"
            >
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col">Current (mA)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(simulationResult.componentCurrents).map(
                  ([compId, currentA]) => {
                    const comp = workingCircuit.components.find(
                      (c) => c.id === compId
                    );
                    const label = comp
                      ? `${comp.id} (${comp.kind === 'resistor' ? 'resistor' : 'voltage source'})`
                      : compId;
                    return (
                      <tr key={compId}>
                        <td>{label}</td>
                        <td>{(currentA * 1000).toFixed(3)}</td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>

            <h4>Node Voltages</h4>
            <table
              className="student-results-table"
              aria-label="Node voltages from simulation"
            >
              <thead>
                <tr>
                  <th scope="col">Node</th>
                  <th scope="col">Voltage (V)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(simulationResult.nodeVoltages).map(
                  ([nodeId, voltage]) => {
                    const node = workingCircuit.nodes.find(
                      (n) => n.id === nodeId
                    );
                    const label = node?.label ?? nodeId;
                    return (
                      <tr key={nodeId}>
                        <td>{label}</td>
                        <td>{voltage.toFixed(4)}</td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <div className="student-actions">
        <button
          type="button"
          id="result-back-btn"
          className="student-btn student-btn--ghost"
          onClick={onBack}
        >
          Back to Experiment
        </button>
        <button
          type="button"
          id="result-continue-btn"
          className="student-btn student-btn--primary"
          onClick={onContinue}
          disabled={!canContinue}
          aria-disabled={!canContinue}
          aria-describedby={!canContinue ? 'result-continue-note' : undefined}
        >
          Continue to Reconstruction
        </button>
      </div>

      {!canContinue && (
        <p id="result-continue-note" className="student-note">
          {simulateCircuit === undefined
            ? 'The simulator must be connected before you can proceed.'
            : simulationResult === null
              ? 'Run the simulation first to continue.'
              : 'Fix the simulation error to continue.'}
        </p>
      )}
    </section>
  );
}
