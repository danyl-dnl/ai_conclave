import { useState, useRef, useEffect } from 'react';
import type { Circuit } from '../shared/types';
import type {
  SimulateCircuitFn,
  VerifyCircuitFn,
  OnLearningEventFn,
  SimulationResult,
  VerificationResult,
  LearningEvent,
} from './studentTypes';
import { deepCloneCircuit } from './circuitUtils';
import type { EditRecord } from './Experiment';
import Explore from './Explore';
import Predict from './Predict';
import Experiment from './Experiment';
import Result from './Result';
import Reconstruct from './Reconstruct';
import './student.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityStep =
  | 'explore'
  | 'predict'
  | 'experiment'
  | 'result'
  | 'reconstruct'
  | 'verification';

const STEP_LABELS: Record<ActivityStep, string> = {
  explore: 'Explore',
  predict: 'Predict',
  experiment: 'Experiment',
  result: 'Result',
  reconstruct: 'Reconstruct',
  verification: 'Verification',
};

const STEP_ORDER: ActivityStep[] = [
  'explore',
  'predict',
  'experiment',
  'result',
  'reconstruct',
  'verification',
];

// ─── Public interface ─────────────────────────────────────────────────────────

export interface StudentActivityProps {
  /**
   * The approved reference circuit from Developer 1's teacher flow.
   * Never mutated by any student component.
   */
  circuit: Circuit;

  /**
   * Developer 3's MNA simulator.
   * Optional — if absent the Result step shows an integration-status message
   * and blocks progression to Reconstruction.
   */
  simulateCircuit?: SimulateCircuitFn;

  /**
   * Developer 4's structural verifier.
   * Optional — if absent the Verification step shows an integration-status
   * message; the reconstruction is still submitted and recorded.
   */
  verifyCircuit?: VerifyCircuitFn;

  /**
   * Developer 4's evidence hook.
   * Optional — if absent, events are silently dropped.
   * No localStorage is accessed inside src/student/.
   */
  onLearningEvent?: OnLearningEventFn;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoNow(): string {
  return new Date().toISOString();
}

// ─── Verification step (inline — used only in StudentActivity) ────────────────

interface VerificationStepProps {
  reconstructedCircuit: Circuit | null;
  verificationResult: VerificationResult | null;
  verifyCircuitConnected: boolean;
  onBack: () => void;
}

function VerificationStep({
  reconstructedCircuit,
  verificationResult,
  verifyCircuitConnected,
  onBack,
}: VerificationStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="student-step" aria-labelledby="verification-heading">
      <h2
        id="verification-heading"
        ref={headingRef}
        tabIndex={-1}
        className="student-step-heading"
      >
        Verification Result
      </h2>

      {!verifyCircuitConnected && (
        <div className="student-integration-status" role="note">
          <p>
            <strong>Integration status:</strong> The structural verifier is not yet
            connected to this activity.
          </p>
          <p>
            Your reconstruction has been submitted and recorded. The verifier will
            compare it to the reference circuit when the integration is complete.
          </p>
        </div>
      )}

      {reconstructedCircuit !== null && verificationResult !== null && (
        <div>
          {verificationResult.equivalent ? (
            <div
              className="student-result-panel student-result-panel--success"
              role="note"
              aria-label="Verification passed"
            >
              <p>
                <strong>Equivalent.</strong> Your reconstruction matches the
                reference circuit structure. Node names do not need to match.
              </p>
            </div>
          ) : (
            <div
              className="student-result-panel student-result-panel--fail"
              role="note"
              aria-label="Verification failed"
            >
              <p>
                <strong>Not equivalent.</strong>{' '}
                {verificationResult.mismatches.length === 1
                  ? 'One mismatch was found:'
                  : `${verificationResult.mismatches.length} mismatches were found:`}
              </p>
              <ul className="student-mismatch-list">
                {verificationResult.mismatches.map((m, i) => (
                  <li key={i}>
                    <span className="student-mismatch-type">{m.type}:</span>{' '}
                    {m.message}
                    {m.componentId !== undefined && (
                      <span className="student-mismatch-component">
                        {' '}(Component: {m.componentId})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="student-actions">
        <button
          type="button"
          id="verification-back-btn"
          className="student-btn student-btn--ghost"
          onClick={onBack}
        >
          Back to Reconstruction
        </button>
      </div>
    </section>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Top-level student activity orchestrator.
 *
 * Owns all activity state:
 *   - step progression (explore → predict → experiment → result → reconstruct → verification)
 *   - working circuit (deep clone of reference; never mutates reference)
 *   - prediction (frozen after first save)
 *   - edit log
 *   - simulation result
 *   - reconstructed circuit
 *   - verification result
 *
 * Reset clears ALL state including prediction.
 *
 * External integrations (simulate, verify, evidence) are supplied as optional
 * props. If absent, the UI degrades gracefully — no hard-coded values, no
 * competing implementations.
 */
export default function StudentActivity({
  circuit: referenceCircuit,
  simulateCircuit,
  verifyCircuit,
  onLearningEvent,
}: StudentActivityProps) {
  // ── Activity state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<ActivityStep>('explore');
  const [workingCircuit, setWorkingCircuit] = useState<Circuit>(() =>
    deepCloneCircuit(referenceCircuit)
  );
  const [prediction, setPrediction] = useState<string | null>(null);
  const [editLog, setEditLog] = useState<EditRecord[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [reconstructedCircuit, setReconstructedCircuit] = useState<Circuit | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [announcementText, setAnnouncementText] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  function emit(event: LearningEvent) {
    onLearningEvent?.(event);
  }

  function announce(msg: string) {
    // Clear first so the same message re-triggers aria-live.
    setAnnouncementText('');
    requestAnimationFrame(() => setAnnouncementText(msg));
  }

  function goTo(next: ActivityStep) {
    setStep(next);
    announce(`Moved to ${STEP_LABELS[next]} step.`);
  }

  // ── Reset — clears ALL state including prediction ──────────────────────────

  function handleReset() {
    setStep('explore');
    setWorkingCircuit(deepCloneCircuit(referenceCircuit));
    setPrediction(null);
    setEditLog([]);
    setSimulationResult(null);
    setReconstructedCircuit(null);
    setVerificationResult(null);
    announce('Activity reset. All changes cleared.');
  }

  // ── Explore ────────────────────────────────────────────────────────────────

  function handleExploreContinue() {
    goTo('predict');
  }

  // ── Predict ────────────────────────────────────────────────────────────────

  function handleSavePrediction(text: string) {
    setPrediction(text);
    emit({
      kind: 'prediction-saved',
      timestamp: isoNow(),
      payload: { prediction: text },
    });
    announce('Prediction saved.');
  }

  function handlePredictContinue() {
    goTo('experiment');
  }

  // ── Experiment ─────────────────────────────────────────────────────────────

  function handleApplyEdit(updatedCircuit: Circuit, edit: EditRecord) {
    setWorkingCircuit(updatedCircuit);
    setEditLog((prev) => [...prev, edit]);
    // Invalidate any prior simulation result — circuit has changed.
    setSimulationResult(null);
    emit({
      kind: 'circuit-edit-applied',
      timestamp: isoNow(),
      payload: {
        componentId: edit.componentId,
        terminalId: edit.terminalId,
        action: 'disconnect',
      },
    });
  }

  function handleExperimentContinue() {
    goTo('result');
  }

  // ── Result / Simulation ────────────────────────────────────────────────────

  function handleRequestSimulation() {
    if (!simulateCircuit) return;
    const result = simulateCircuit(workingCircuit);
    setSimulationResult(result);
    emit({
      kind: 'simulation-completed',
      timestamp: isoNow(),
      payload: { result },
    });
    announce(
      result.status === 'success'
        ? 'Simulation completed successfully.'
        : `Simulation error: ${result.message}`
    );
  }

  function handleResultContinue() {
    // Guard: only callable when simulation succeeded (enforced by Result component too).
    if (simulationResult?.status !== 'success') return;
    goTo('reconstruct');
  }

  // ── Reconstruct / Verify ──────────────────────────────────────────────────

  function handleReconstructSubmit(studentCircuit: Circuit) {
    setReconstructedCircuit(studentCircuit);
    emit({
      kind: 'reconstruction-submitted',
      timestamp: isoNow(),
      payload: { studentCircuit },
    });

    if (verifyCircuit) {
      const result = verifyCircuit(referenceCircuit, studentCircuit);
      setVerificationResult(result);
      emit({
        kind: 'verification-result-received',
        timestamp: isoNow(),
        payload: { result },
      });
      announce(
        result.equivalent
          ? 'Reconstruction verified: circuits are equivalent.'
          : `Reconstruction not equivalent. ${result.mismatches.length} mismatch${result.mismatches.length === 1 ? '' : 'es'} found.`
      );
    } else {
      announce('Reconstruction submitted. Verifier is not yet connected.');
    }

    goTo('verification');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      className="student-activity"
      aria-label="Circuit learning activity"
    >
      {/* Global aria-live region — one per page; concise messages only */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="student-sr-announcement"
      >
        {announcementText}
      </div>

      {/* Progress indicator */}
      <nav aria-label="Activity progress">
        <ol className="student-progress">
          {STEP_ORDER.map((s) => (
            <li key={s} aria-current={s === step ? 'step' : undefined}>
              {STEP_LABELS[s]}
            </li>
          ))}
        </ol>
      </nav>

      {/* Reset control */}
      <div className="student-activity-toolbar">
        <button
          type="button"
          id="activity-reset-btn"
          className="student-btn student-btn--ghost student-btn--sm"
          onClick={handleReset}
        >
          Reset Activity
        </button>
      </div>

      {/* Step rendering */}
      {step === 'explore' && (
        <Explore circuit={referenceCircuit} onContinue={handleExploreContinue} />
      )}

      {step === 'predict' && (
        <Predict
          circuit={referenceCircuit}
          savedPrediction={prediction}
          onSavePrediction={handleSavePrediction}
          onContinue={handlePredictContinue}
          onBack={() => goTo('explore')}
        />
      )}

      {step === 'experiment' && (
        <Experiment
          workingCircuit={workingCircuit}
          editLog={editLog}
          onApplyEdit={handleApplyEdit}
          onContinue={handleExperimentContinue}
          onBack={() => goTo('predict')}
        />
      )}

      {step === 'result' && prediction !== null && (
        <Result
          prediction={prediction}
          workingCircuit={workingCircuit}
          simulationResult={simulationResult}
          simulateCircuit={simulateCircuit}
          onRequestSimulation={handleRequestSimulation}
          onContinue={handleResultContinue}
          onBack={() => goTo('experiment')}
        />
      )}

      {step === 'reconstruct' && (
        <Reconstruct
          referenceCircuit={referenceCircuit}
          onSubmit={handleReconstructSubmit}
          onBack={() => goTo('result')}
        />
      )}

      {step === 'verification' && (
        <VerificationStep
          reconstructedCircuit={reconstructedCircuit}
          verificationResult={verificationResult}
          verifyCircuitConnected={verifyCircuit !== undefined}
          onBack={() => goTo('reconstruct')}
        />
      )}
    </main>
  );
}
