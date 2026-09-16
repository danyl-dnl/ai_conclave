import { describe, it, expect } from 'vitest';
import { validateCircuit } from './circuitValidation';
import { goldenCircuit } from '../../shared/demoCircuit';
import type { Circuit } from '../../shared/types';

describe('Circuit Validation', () => {
  it('validates the golden parallel circuit', () => {
    const result = validateCircuit(goldenCircuit);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects duplicate component IDs', () => {
    const invalidCircuit: Circuit = {
      ...goldenCircuit,
      components: [
        ...goldenCircuit.components,
        { ...goldenCircuit.components[0] } // duplicate V1
      ]
    };
    const result = validateCircuit(invalidCircuit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_COMPONENT_ID')).toBe(true);
  });

  it('rejects terminal references to nonexistent nodes', () => {
    const invalidCircuit: Circuit = {
      ...goldenCircuit,
      components: [
        {
          ...goldenCircuit.components[0],
          terminals: [
            { id: 'V1-pos', nodeId: 'Z' }, // Z does not exist
            { id: 'V1-neg', nodeId: 'B' }
          ]
        },
        ...goldenCircuit.components.slice(1)
      ]
    };
    const result = validateCircuit(invalidCircuit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'NONEXISTENT_NODE')).toBe(true);
  });

  it('rejects invalid resistor value', () => {
    const invalidCircuit: Circuit = {
      ...goldenCircuit,
      components: [
        goldenCircuit.components[0],
        { ...goldenCircuit.components[1], value: -5 }, // Invalid resistance
        goldenCircuit.components[2]
      ]
    };
    const result = validateCircuit(invalidCircuit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_RESISTANCE')).toBe(true);
  });

  it('rejects missing or malformed numeric values', () => {
    const invalidCircuit: Circuit = {
      ...goldenCircuit,
      components: [
        goldenCircuit.components[0],
        { ...goldenCircuit.components[1], value: NaN },
        goldenCircuit.components[2]
      ]
    };
    const result = validateCircuit(invalidCircuit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_VALUE')).toBe(true);
  });

  it('accepts intentionally disconnected terminals', () => {
    const validCircuit: Circuit = {
      ...goldenCircuit,
      components: [
        goldenCircuit.components[0],
        {
          ...goldenCircuit.components[1],
          terminals: [
            { id: 'R1-a', nodeId: null }, // intentionally disconnected
            { id: 'R1-b', nodeId: 'B' }
          ]
        },
        goldenCircuit.components[2]
      ]
    };
    const result = validateCircuit(validCircuit);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
