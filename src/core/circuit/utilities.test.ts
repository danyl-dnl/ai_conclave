import { describe, it, expect } from 'vitest';
import { getComponentById, getNodeById, getConnectionsForNode } from './utilities';
import { goldenCircuit } from '../../shared/demoCircuit';

describe('Circuit Utilities', () => {
  it('gets a component by ID', () => {
    const r1 = getComponentById(goldenCircuit, 'R1');
    expect(r1).toBeDefined();
    expect(r1?.type).toBe('resistor');
    expect(r1?.value).toBe(100);

    const nonExistent = getComponentById(goldenCircuit, 'X99');
    expect(nonExistent).toBeUndefined();
  });

  it('gets a node by ID', () => {
    const nodeA = getNodeById(goldenCircuit, 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA?.label).toBe('A');

    const nonExistent = getNodeById(goldenCircuit, 'Z');
    expect(nonExistent).toBeUndefined();
  });

  it('gets connections for a node', () => {
    const connectionsA = getConnectionsForNode(goldenCircuit, 'A');
    // Golden circuit has V1-pos, R1-a, R2-a connected to Node A
    expect(connectionsA).toHaveLength(3);
    expect(connectionsA.map((c) => c.componentId)).toEqual(expect.arrayContaining(['V1', 'R1', 'R2']));

    const connectionsZ = getConnectionsForNode(goldenCircuit, 'Z');
    expect(connectionsZ).toHaveLength(0);
  });
});
