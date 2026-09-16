/**
 * Pure functions that generate human-readable text from the Circuit model.
 *
 * Rules:
 * - No hard-coded circuit facts (names, values, node IDs).
 * - All descriptions are derived from the Circuit object at call time.
 * - No React, no side effects.
 */

import type { Circuit, CircuitComponent } from '../shared/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return a human-readable label for a component terminal. */
function terminalLabel(kind: CircuitComponent['kind'], terminalId: string): string {
  if (kind === 'voltage-source') {
    if (terminalId === 'positive') return 'positive terminal';
    if (terminalId === 'negative') return 'negative terminal';
  }
  return `terminal ${terminalId}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a concise overview sentence from the Circuit model.
 *
 * Example output:
 * "Parallel Resistor Circuit. One voltage source (6 volt). 2 resistors. 2 electrical nodes."
 */
export function circuitOverview(circuit: Circuit): string {
  const sources = circuit.components.filter((c) => c.kind === 'voltage-source');
  const resistors = circuit.components.filter((c) => c.kind === 'resistor');
  const nodeCount = circuit.nodes.length;

  const parts: string[] = [circuit.label];

  if (sources.length > 0) {
    const sourceDetails = sources.map((c) =>
      c.kind === 'voltage-source' ? `${c.voltageVolts} volt` : ''
    );
    const noun = sources.length === 1 ? 'voltage source' : 'voltage sources';
    const countWord = sources.length === 1 ? 'One' : `${sources.length}`;
    parts.push(`${countWord} ${noun} (${sourceDetails.join(', ')})`);
  }

  if (resistors.length > 0) {
    const noun = resistors.length === 1 ? 'resistor' : 'resistors';
    parts.push(`${resistors.length} ${noun}`);
  }

  const nodeNoun = nodeCount === 1 ? 'electrical node' : 'electrical nodes';
  parts.push(`${nodeCount} ${nodeNoun}`);

  return parts.join('. ') + '.';
}

/**
 * Generate a detailed description for a single component.
 * Returns an empty string if the component ID is not found.
 *
 * Example output (resistor, connected):
 * "R1: Resistor, 100 ohms. Terminal A connected to Node A. Terminal B connected to Node B."
 *
 * Example output (resistor, terminal disconnected):
 * "R1: Resistor, 100 ohms. Terminal A: disconnected. Terminal B connected to Node B."
 */
export function componentDescription(circuit: Circuit, componentId: string): string {
  const comp = circuit.components.find((c) => c.id === componentId);
  if (!comp) return '';

  const lines: string[] = [];

  if (comp.kind === 'resistor') {
    lines.push(`${comp.id}: Resistor, ${comp.resistanceOhms} ohms`);
    for (const t of comp.terminals) {
      if (t.nodeId !== null) {
        const node = circuit.nodes.find((n) => n.id === t.nodeId);
        const nodeLabel = node?.label ?? t.nodeId;
        lines.push(`Terminal ${t.terminalId} connected to ${nodeLabel}`);
      } else {
        lines.push(`Terminal ${t.terminalId}: disconnected`);
      }
    }
  } else if (comp.kind === 'voltage-source') {
    lines.push(`${comp.id}: Voltage source, ${comp.voltageVolts} volts DC`);
    for (const t of comp.terminals) {
      const tLabel = terminalLabel('voltage-source', t.terminalId);
      const prefix = capitalise(tLabel);
      if (t.nodeId !== null) {
        const node = circuit.nodes.find((n) => n.id === t.nodeId);
        const nodeLabel = node?.label ?? t.nodeId;
        lines.push(`${prefix} connected to ${nodeLabel}`);
      } else {
        lines.push(`${prefix}: disconnected`);
      }
    }
  }

  return lines.join('. ') + '.';
}

/**
 * Generate a connectivity description for an electrical node.
 *
 * Example output:
 * "Node A is connected to: V1 positive terminal, R1 terminal A, R2 terminal A."
 */
export function nodeConnectionDescription(circuit: Circuit, nodeId: string): string {
  const node = circuit.nodes.find((n) => n.id === nodeId);
  if (!node) return `Node ${nodeId} not found.`;

  const nodeName = node.label ?? node.id;
  const connections: string[] = [];

  for (const comp of circuit.components) {
    for (const t of comp.terminals) {
      if (t.nodeId === nodeId) {
        connections.push(`${comp.id} ${terminalLabel(comp.kind, t.terminalId)}`);
      }
    }
  }

  if (connections.length === 0) {
    return `${nodeName} has no connections.`;
  }
  return `${nodeName} is connected to: ${connections.join(', ')}.`;
}

/**
 * Return all component IDs in the circuit in document order.
 */
export function componentIds(circuit: Circuit): string[] {
  return circuit.components.map((c) => c.id);
}
