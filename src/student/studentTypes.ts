/**
 * Integration type stubs for Developer 2's student subsystem.
 *
 * These document the EXPECTED API shapes for:
 *   - Developer 3: simulateCircuit
 *   - Developer 4: verifyCircuit, onLearningEvent
 *
 * When the real modules land in the integration layer, the parent (App.tsx)
 * passes the real functions as props to <StudentActivity>. No student
 * component needs to change.
 *
 * No localStorage is accessed inside src/student/.
 */

import type { Circuit } from '../shared/types';

// ─── Developer 3: Simulation ──────────────────────────────────────────────────

/** A successful MNA simulation result from Developer 3. */
export interface SimulationSuccess {
  status: 'success';
  /** Node voltages in volts, keyed by node ID. */
  nodeVoltages: Record<string, number>;
  /** Branch currents in amperes (signed), keyed by component ID. */
  componentCurrents: Record<string, number>;
}

/** An error result when the circuit is invalid or unsolvable. */
export interface SimulationError {
  status: 'error';
  message: string;
  code?: string;
}

export type SimulationResult = SimulationSuccess | SimulationError;

/**
 * The function signature Developer 3 must satisfy.
 * Accepts a Circuit (possibly with disconnected terminals); returns SimulationResult.
 */
export type SimulateCircuitFn = (circuit: Circuit) => SimulationResult;

// ─── Developer 4: Verification ────────────────────────────────────────────────

export type MismatchType =
  | 'component-count'
  | 'component-kind'
  | 'component-value'
  | 'connectivity'
  | 'polarity';

/** A structured description of one structural mismatch from the verifier. */
export interface VerificationMismatch {
  type: MismatchType;
  message: string;
  /** Component involved in the mismatch, when applicable. */
  componentId?: string;
}

/** Result from Developer 4's structural graph verifier. */
export interface VerificationResult {
  equivalent: boolean;
  /** Empty array when equivalent is true. */
  mismatches: VerificationMismatch[];
}

/**
 * The function signature Developer 4's verifier must satisfy.
 * Accepts (reference, student) circuits; returns VerificationResult.
 * Node labels may differ — verifier checks structural connectivity only.
 */
export type VerifyCircuitFn = (
  reference: Circuit,
  student: Circuit
) => VerificationResult;

// ─── Developer 4: Evidence ────────────────────────────────────────────────────

export type LearningEventKind =
  | 'prediction-saved'
  | 'circuit-edit-applied'
  | 'simulation-completed'
  | 'reconstruction-submitted'
  | 'verification-result-received';

export interface PredictionSavedPayload {
  prediction: string;
}

export interface CircuitEditAppliedPayload {
  componentId: string;
  terminalId: string;
  action: 'disconnect';
}

export interface SimulationCompletedPayload {
  result: SimulationResult;
}

export interface ReconstructionSubmittedPayload {
  studentCircuit: Circuit;
}

export interface VerificationResultReceivedPayload {
  result: VerificationResult;
}

export interface LearningEvent {
  kind: LearningEventKind;
  timestamp: string; // ISO-8601
  payload:
    | PredictionSavedPayload
    | CircuitEditAppliedPayload
    | SimulationCompletedPayload
    | ReconstructionSubmittedPayload
    | VerificationResultReceivedPayload;
}

/**
 * The evidence callback Developer 4 must satisfy.
 * Called at each meaningful learning milestone.
 */
export type OnLearningEventFn = (event: LearningEvent) => void;
