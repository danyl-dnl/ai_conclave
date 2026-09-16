/**
 * Pure circuit utility functions used within src/student/.
 * No React, no side effects, no simulation logic.
 */

import type { Circuit, Terminal } from '../shared/types';

/**
 * Deep-clone a Circuit so the reference is never mutated.
 * JSON round-trip is safe: Circuit contains only serialisable primitives.
 */
export function deepCloneCircuit(circuit: Circuit): Circuit {
  return JSON.parse(JSON.stringify(circuit)) as Circuit;
}

/**
 * Return a new Circuit where the specified terminal's nodeId is set to null
 * (electrically disconnected). The input circuit is NOT mutated.
 *
 * Setting nodeId to null is the canonical representation of disconnection
 * agreed by the team. Developer 3's simulator will receive this value and
 * detect the open branch.
 */
export function disconnectTerminal(
  circuit: Circuit,
  componentId: string,
  terminalId: string
): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((comp) => {
      if (comp.id !== componentId) return comp;
      return {
        ...comp,
        terminals: comp.terminals.map((t) =>
          t.id === terminalId ? { ...t, nodeId: null } : t
        ) as [Terminal, Terminal],
      };
    }),
  };
}
