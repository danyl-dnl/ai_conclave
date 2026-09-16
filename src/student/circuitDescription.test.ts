import { describe, it, expect } from 'vitest';
import {
  circuitOverview,
  componentDescription,
  nodeConnectionDescription,
  componentIds,
} from './circuitDescription';
import type { Circuit } from '../shared/types';

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** Golden parallel circuit (no hard-coded descriptions — descriptions are generated). */
const goldenCircuit: Circuit = {
  id: 'test-golden',
  label: 'Parallel Resistor Circuit',
  nodes: [
    { id: 'A', label: 'Node A' },
    { id: 'B', label: 'Node B' },
  ],
  components: [
    {
      kind: 'voltage-source',
      id: 'V1',
      voltageVolts: 6,
      terminals: [
        { terminalId: 'positive', nodeId: 'A' },
        { terminalId: 'negative', nodeId: 'B' },
      ],
    },
    {
      kind: 'resistor',
      id: 'R1',
      resistanceOhms: 100,
      terminals: [
        { terminalId: 'A', nodeId: 'A' },
        { terminalId: 'B', nodeId: 'B' },
      ],
    },
    {
      kind: 'resistor',
      id: 'R2',
      resistanceOhms: 200,
      terminals: [
        { terminalId: 'A', nodeId: 'A' },
        { terminalId: 'B', nodeId: 'B' },
      ],
    },
  ],
};

/** Same circuit but R1 terminal A has been disconnected (nodeId = null). */
const circuitAfterDisconnect: Circuit = {
  ...goldenCircuit,
  components: goldenCircuit.components.map((c) => {
    if (c.id !== 'R1') return c;
    return {
      ...c,
      terminals: c.terminals.map((t) =>
        t.terminalId === 'A' ? { ...t, nodeId: null } : t
      ) as [import('../shared/types').TerminalConnection, import('../shared/types').TerminalConnection],
    };
  }),
};

/** Minimal single-node single-resistor circuit for edge-case tests. */
const minimalCircuit: Circuit = {
  id: 'test-minimal',
  label: 'Simple Series',
  nodes: [{ id: 'X' }],
  components: [
    {
      kind: 'resistor',
      id: 'R1',
      resistanceOhms: 47,
      terminals: [
        { terminalId: 'A', nodeId: 'X' },
        { terminalId: 'B', nodeId: null },
      ],
    },
  ],
};

// ─── circuitOverview ──────────────────────────────────────────────────────────

describe('circuitOverview', () => {
  it('includes the circuit label', () => {
    expect(circuitOverview(goldenCircuit)).toContain('Parallel Resistor Circuit');
  });

  it('mentions the voltage source count and voltage value', () => {
    const overview = circuitOverview(goldenCircuit);
    expect(overview).toContain('One voltage source');
    expect(overview).toContain('6 volt');
  });

  it('mentions the correct resistor count', () => {
    expect(circuitOverview(goldenCircuit)).toContain('2 resistors');
  });

  it('mentions the correct node count', () => {
    expect(circuitOverview(goldenCircuit)).toContain('2 electrical nodes');
  });

  it('uses singular forms for counts of one', () => {
    const overview = circuitOverview(minimalCircuit);
    expect(overview).toContain('1 resistor');
    expect(overview).toContain('1 electrical node');
  });

  it('does not hard-code the golden circuit node names or values', () => {
    // The overview should be derivable from any circuit, not just the golden one.
    const custom: Circuit = {
      id: 'custom',
      label: 'Custom Circuit',
      nodes: [{ id: 'P' }, { id: 'Q' }, { id: 'R' }],
      components: [
        {
          kind: 'voltage-source',
          id: 'V1',
          voltageVolts: 12,
          terminals: [
            { terminalId: 'positive', nodeId: 'P' },
            { terminalId: 'negative', nodeId: 'Q' },
          ],
        },
      ],
    };
    const overview = circuitOverview(custom);
    expect(overview).toContain('Custom Circuit');
    expect(overview).toContain('12 volt');
    expect(overview).toContain('3 electrical nodes');
  });
});

// ─── componentDescription ────────────────────────────────────────────────────

describe('componentDescription', () => {
  it('returns empty string for an unknown component ID', () => {
    expect(componentDescription(goldenCircuit, 'UNKNOWN')).toBe('');
  });

  it('describes a resistor with both terminals connected', () => {
    const desc = componentDescription(goldenCircuit, 'R1');
    expect(desc).toContain('R1');
    expect(desc).toContain('Resistor');
    expect(desc).toContain('100 ohms');
    expect(desc).toContain('Terminal A');
    expect(desc).toContain('Terminal B');
    expect(desc).toContain('Node A');
    expect(desc).toContain('Node B');
  });

  it('marks a disconnected terminal (nodeId: null) as disconnected', () => {
    const desc = componentDescription(circuitAfterDisconnect, 'R1');
    expect(desc).toContain('Terminal A: disconnected');
    // The still-connected terminal B should show its node.
    expect(desc).toContain('Terminal B');
    expect(desc).toContain('Node B');
  });

  it('describes a voltage source with correct polarity labels', () => {
    const desc = componentDescription(goldenCircuit, 'V1');
    expect(desc).toContain('V1');
    expect(desc).toContain('Voltage source');
    expect(desc).toContain('6 volts');
    expect(desc).toContain('Positive terminal');
    expect(desc).toContain('Negative terminal');
    expect(desc).toContain('Node A');
    expect(desc).toContain('Node B');
  });

  it('uses node label when available', () => {
    // goldenCircuit nodes have label: 'Node A' and 'Node B'.
    const desc = componentDescription(goldenCircuit, 'R1');
    expect(desc).toContain('Node A');
  });

  it('falls back to node id when label is absent', () => {
    // minimalCircuit node X has no label property.
    const desc = componentDescription(minimalCircuit, 'R1');
    expect(desc).toContain('X'); // node id used as fallback
  });
});

// ─── nodeConnectionDescription ───────────────────────────────────────────────

describe('nodeConnectionDescription', () => {
  it('returns not-found message for an unknown node ID', () => {
    expect(nodeConnectionDescription(goldenCircuit, 'MISSING')).toContain('not found');
  });

  it('lists all components connected to Node A', () => {
    const desc = nodeConnectionDescription(goldenCircuit, 'A');
    // V1 positive, R1 terminal A, R2 terminal A are all on node A.
    expect(desc).toContain('V1');
    expect(desc).toContain('positive terminal');
    expect(desc).toContain('R1');
    expect(desc).toContain('R2');
  });

  it('uses node label in the description', () => {
    const desc = nodeConnectionDescription(goldenCircuit, 'A');
    expect(desc).toContain('Node A');
  });

  it('falls back to node id when label is absent', () => {
    const desc = nodeConnectionDescription(minimalCircuit, 'X');
    // Node X has no label; description should start with 'X'.
    expect(desc).toMatch(/^X/);
  });

  it('reports no connections for a truly isolated node', () => {
    const isolated: Circuit = {
      id: 'iso',
      label: 'Isolated',
      nodes: [{ id: 'Z', label: 'Node Z' }],
      components: [],
    };
    const desc = nodeConnectionDescription(isolated, 'Z');
    expect(desc).toContain('no connections');
  });

  it('does not include disconnected terminals (nodeId null) in the list', () => {
    // R1 terminal A is disconnected in circuitAfterDisconnect.
    const desc = nodeConnectionDescription(circuitAfterDisconnect, 'A');
    // V1 and R2 are still on A; R1 terminal A is disconnected so NOT on A.
    expect(desc).toContain('V1');
    expect(desc).toContain('R2');
    // R1 terminal A should NOT appear because its nodeId is null.
    // We check R1 terminal A specifically:
    const lines = desc.split(',').map((s) => s.trim());
    const r1TerminalAEntry = lines.find((l) => l.includes('R1') && l.includes('terminal A'));
    expect(r1TerminalAEntry).toBeUndefined();
  });
});

// ─── componentIds ─────────────────────────────────────────────────────────────

describe('componentIds', () => {
  it('returns component IDs in document order', () => {
    expect(componentIds(goldenCircuit)).toEqual(['V1', 'R1', 'R2']);
  });

  it('returns an empty array for a circuit with no components', () => {
    const empty: Circuit = {
      id: 'e',
      label: 'Empty',
      nodes: [],
      components: [],
    };
    expect(componentIds(empty)).toEqual([]);
  });
});
