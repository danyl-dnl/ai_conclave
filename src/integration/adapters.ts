/**
 * src/integration/adapters.ts
 *
 * Integration-layer adapters for AccessGraph MVP.
 *
 * These bridge the interface differences between subsystem stubs and
 * actual implementations WITHOUT modifying any developer's subsystem files.
 *
 * Developer 2 (Student) expects:
 *   SimulateCircuitFn   -> (circuit) => { status, message?, nodeVoltages?, componentCurrents? }
 *   VerifyCircuitFn     -> (ref, student) => { equivalent, mismatches: VerificationMismatch[] }
 *   OnLearningEventFn   -> (event: { kind, timestamp: ISO-string, payload })
 *
 * Developer 3 (Simulation) provides:
 *   simulateCircuit     -> (circuit) => SimulationSuccessResult | SimulationErrorResult
 *   SimulationErrorResult.error = { code, message, details? }
 *
 * Developer 4 (Verification+Evidence) provides:
 *   verifyCircuit       -> (ref, student) => { equivalent, mismatches: StructuralMismatch[] }
 *   StructuralMismatch.type = uppercase enum e.g. 'MISSING_COMPONENT'
 *   recordLearningEvent -> (sessionId, type, payload) => LearningEvent
 */

import type { Circuit } from '../shared/types';
import type { SimulationResult as Dev3SimResult } from '../simulation/types';
import type { VerificationResult as Dev4VerifyResult, StructuralMismatch } from '../verification/verifyCircuit';
import type {
  SimulateCircuitFn,
  VerifyCircuitFn,
  OnLearningEventFn,
  SimulationResult as Dev2SimResult,
  VerificationResult as Dev2VerifyResult,
  LearningEvent as Dev2LearningEvent,
} from '../student/studentTypes';
import { recordLearningEvent } from '../evidence/eventStore';

// ── Simulation adapter ────────────────────────────────────────────────────────
// Dev 3's error shape: { status: 'error', error: { code, message } }
// Dev 2's error shape: { status: 'error', message, code? }

function adaptSimResult(result: Dev3SimResult): Dev2SimResult {
  if (result.status === 'success') {
    return {
      status: 'success',
      nodeVoltages: result.nodeVoltages,
      componentCurrents: result.componentCurrents,
    };
  }
  return {
    status: 'error',
    message: result.error.message,
    code: result.error.code,
  };
}

export function makeSimulateAdapter(
  realSimulate: (circuit: Circuit) => Dev3SimResult
): SimulateCircuitFn {
  return (circuit: Circuit): Dev2SimResult => adaptSimResult(realSimulate(circuit));
}

// ── Verification adapter ──────────────────────────────────────────────────────
// Dev 4's mismatch type: uppercase e.g. 'MISSING_COMPONENT', 'VALUE_MISMATCH'
// Dev 2's mismatch type: lowercase-hyphen e.g. 'component-count', 'component-value'

function adaptMismatchType(type: StructuralMismatch['type']): Dev2VerifyResult['mismatches'][number]['type'] {
  switch (type) {
    case 'MISSING_COMPONENT':
    case 'EXTRA_COMPONENT':
      return 'component-count';
    case 'VALUE_MISMATCH':
      return 'component-value';
    case 'POLARITY_MISMATCH':
      return 'polarity';
    case 'CONNECTION_MISMATCH':
    case 'TOPOLOGY_MISMATCH':
    case 'DISCONNECTED_TERMINAL':
      return 'connectivity';
    case 'MALFORMED_CIRCUIT':
    default:
      return 'connectivity';
  }
}

function adaptVerifyResult(result: Dev4VerifyResult): Dev2VerifyResult {
  return {
    equivalent: result.equivalent,
    mismatches: result.mismatches.map((m) => ({
      type: adaptMismatchType(m.type),
      message: m.message,
      componentId: m.componentId,
    })),
  };
}

export function makeVerifyAdapter(
  realVerify: (ref: Circuit, student: Circuit) => Dev4VerifyResult
): VerifyCircuitFn {
  return (ref: Circuit, student: Circuit): Dev2VerifyResult =>
    adaptVerifyResult(realVerify(ref, student));
}

// ── Evidence / Learning event adapter ────────────────────────────────────────
// Dev 2 emits: { kind: LearningEventKind, timestamp: ISO-string, payload }
// Dev 4 expects: recordLearningEvent(sessionId, type, payload)
//
// Mapping:
//   'prediction-saved'              -> 'prediction'
//   'circuit-edit-applied'          -> 'edit'
//   'simulation-completed'          -> 'simulation'
//   'reconstruction-submitted'      -> 'reconstruction'
//   'verification-result-received'  -> 'verification'

function kindToType(kind: Dev2LearningEvent['kind']) {
  const map: Record<Dev2LearningEvent['kind'], string> = {
    'prediction-saved': 'prediction',
    'circuit-edit-applied': 'edit',
    'simulation-completed': 'simulation',
    'reconstruction-submitted': 'reconstruction',
    'verification-result-received': 'verification',
  } as const;
  return map[kind] as 'prediction' | 'edit' | 'simulation' | 'reconstruction' | 'verification';
}

export function makeOnLearningEventAdapter(sessionId: string): OnLearningEventFn {
  return (event: Dev2LearningEvent) => {
    recordLearningEvent(sessionId, kindToType(event.kind), event.payload);
  };
}
