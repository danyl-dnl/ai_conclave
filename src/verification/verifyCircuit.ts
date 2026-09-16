import type { Circuit } from '../shared/types';
import { checkStructuralEquivalence } from './graphMatcher';

export type MismatchType =
  | 'MISSING_COMPONENT'
  | 'EXTRA_COMPONENT'
  | 'VALUE_MISMATCH'
  | 'POLARITY_MISMATCH'
  | 'CONNECTION_MISMATCH'
  | 'DISCONNECTED_TERMINAL'
  | 'TOPOLOGY_MISMATCH'
  | 'MALFORMED_CIRCUIT';

export interface StructuralMismatch {
  type: MismatchType;
  message: string;
  componentId?: string;
}

export interface VerificationResult {
  equivalent: boolean;
  mismatches: StructuralMismatch[];
}

export function verifyCircuit(reference: Circuit, student: Circuit): VerificationResult {
  if (!reference || !student || !Array.isArray(reference.components) || !Array.isArray(student.components)) {
    return {
      equivalent: false,
      mismatches: [{
        type: 'MALFORMED_CIRCUIT',
        message: 'The provided circuit data is malformed or incomplete.'
      }]
    };
  }

  // Ensure no disconnected terminals in student reconstruction (or handle them)
  const disconnected = student.components.find(c => 
    c.terminals && c.terminals.some(t => t.nodeId === null)
  );

  if (disconnected) {
    return {
      equivalent: false,
      mismatches: [{
        type: 'DISCONNECTED_TERMINAL',
        message: 'A component has an unconnected terminal.',
        componentId: disconnected.id
      }]
    };
  }
  
  const malformed = student.components.find(c =>
    !c.terminals || c.terminals.some(t => t.nodeId === undefined)
  );

  if (malformed) {
    return {
      equivalent: false,
      mismatches: [{
        type: 'MALFORMED_CIRCUIT',
        message: 'A component contains malformed or undefined terminal data.',
        componentId: malformed.id
      }]
    };
  }

  return checkStructuralEquivalence(reference, student);
}
