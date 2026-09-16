import { describe, it, expect } from 'vitest';
import { simulateCircuit } from './simulateCircuit';
import { goldenCircuit } from '../shared/demoCircuit';
import type { Circuit } from '../shared/types';

describe('simulateCircuit Electrical Engine', () => {
    it('solves the Golden Circuit correctly from shared data', () => {
        const result = simulateCircuit(goldenCircuit);

        expect(result.status).toBe('success');
        if (result.status !== 'success') return;

        // Golden circuit specs: V1 = 6V, R1 = 100 ohm, R2 = 200 ohm
        // Nodes: A, B. V1 pos -> A, neg -> B. R1: A<->B, R2: A<->B.
        expect(Math.abs(result.componentCurrents['R1'])).toBeCloseTo(0.06, 4);
        expect(Math.abs(result.componentCurrents['R2'])).toBeCloseTo(0.03, 4);
        expect(Math.abs(result.componentCurrents['V1'])).toBeCloseTo(0.09, 4);
    });

    it('Test A: Single resistor circuit (6V source + 100 ohm resistor)', () => {
        const circuit: Circuit = {
            id: 'test-single-resistor',
            name: 'Single Resistor Circuit',
            nodes: [
                { id: 'A', label: 'A' },
                { id: 'B', label: 'B' },
            ],
            components: [
                {
                    id: 'V1',
                    type: 'voltage_source',
                    value: 6,
                    terminals: [
                        { id: 'V1-pos', nodeId: 'A' },
                        { id: 'V1-neg', nodeId: 'B' },
                    ],
                },
                {
                    id: 'R1',
                    type: 'resistor',
                    value: 100,
                    terminals: [
                        { id: 'R1-a', nodeId: 'A' },
                        { id: 'R1-b', nodeId: 'B' },
                    ],
                },
            ],
        };

        const result = simulateCircuit(circuit);

        expect(result.status).toBe('success');
        if (result.status !== 'success') return;

        expect(result.nodeVoltages['B']).toBe(0);
        expect(result.nodeVoltages['A']).toBe(6);
        expect(Math.abs(result.componentCurrents['R1'])).toBeCloseTo(0.06, 4);
        expect(Math.abs(result.componentCurrents['V1'])).toBeCloseTo(0.06, 4);
    });

    it('Test B: Two series resistors (100 + 200 ohm on 6V with exact deterministic node voltage)', () => {
        // V1 pos -> A, neg -> C (Ground)
        // R1: A <-> B (100 ohm)
        // R2: B <-> C (200 ohm)
        const circuit: Circuit = {
            id: 'test-series-resistors',
            name: 'Series Resistors Circuit',
            nodes: [
                { id: 'A', label: 'A' },
                { id: 'B', label: 'B' },
                { id: 'C', label: 'C' },
            ],
            components: [
                {
                    id: 'V1',
                    type: 'voltage_source',
                    value: 6,
                    terminals: [
                        { id: 'V1-pos', nodeId: 'A' },
                        { id: 'V1-neg', nodeId: 'C' },
                    ],
                },
                {
                    id: 'R1',
                    type: 'resistor',
                    value: 100,
                    terminals: [
                        { id: 'R1-a', nodeId: 'A' },
                        { id: 'R1-b', nodeId: 'B' },
                    ],
                },
                {
                    id: 'R2',
                    type: 'resistor',
                    value: 200,
                    terminals: [
                        { id: 'R2-a', nodeId: 'B' },
                        { id: 'R2-b', nodeId: 'C' },
                    ],
                },
            ],
        };

        const result = simulateCircuit(circuit);

        expect(result.status).toBe('success');
        if (result.status !== 'success') return;

        expect(result.nodeVoltages['C']).toBe(0);
        expect(result.nodeVoltages['A']).toBe(6);
        // Intermediate node B voltage must be exactly 4.0V
        expect(result.nodeVoltages['B']).toBeCloseTo(4.0, 4);

        // Total current magnitude = 0.02 A (20 mA)
        expect(Math.abs(result.componentCurrents['R1'])).toBeCloseTo(0.02, 4);
        expect(Math.abs(result.componentCurrents['R2'])).toBeCloseTo(0.02, 4);
        expect(Math.abs(result.componentCurrents['V1'])).toBeCloseTo(0.02, 4);
    });

    it('Test C & D: Disconnecting R1 leaves R1 current = 0 and R2 current ~ 0.03A', () => {
        const circuit: Circuit = JSON.parse(JSON.stringify(goldenCircuit));
        // Disconnect R1
        circuit.components[1].terminals[0].nodeId = null;

        const result = simulateCircuit(circuit);

        expect(result.status).toBe('success');
        if (result.status !== 'success') return;

        expect(result.componentCurrents['R1']).toBe(0);
        expect(Math.abs(result.componentCurrents['R2'])).toBeCloseTo(0.03, 4);
        expect(Math.abs(result.componentCurrents['V1'])).toBeCloseTo(0.03, 4);
    });

    it('Test E: Invalid resistance returns structured error', () => {
        const circuit: Circuit = {
            id: 'test-invalid-resistor',
            name: 'Invalid Resistor',
            nodes: [
                { id: 'A', label: 'A' },
                { id: 'B', label: 'B' },
            ],
            components: [
                {
                    id: 'V1',
                    type: 'voltage_source',
                    value: 6,
                    terminals: [
                        { id: 'V1-pos', nodeId: 'A' },
                        { id: 'V1-neg', nodeId: 'B' },
                    ],
                },
                {
                    id: 'R1',
                    type: 'resistor',
                    value: -10, // Invalid negative resistance
                    terminals: [
                        { id: 'R1-a', nodeId: 'A' },
                        { id: 'R1-b', nodeId: 'B' },
                    ],
                },
            ],
        };

        const result = simulateCircuit(circuit);

        expect(result.status).toBe('error');
        if (result.status === 'error') {
            expect(result.error.code).toBe('INVALID_RESISTANCE');
        }
    });

    it('Test F: Disconnected/incomplete voltage source returns INCOMPLETE_VOLTAGE_SOURCE error', () => {
        const circuit: Circuit = {
            id: 'test-incomplete-source',
            name: 'Incomplete Voltage Source',
            nodes: [{ id: 'A', label: 'A' }],
            components: [
                {
                    id: 'V1',
                    type: 'voltage_source',
                    value: 6,
                    terminals: [
                        { id: 'V1-pos', nodeId: 'A' },
                        { id: 'V1-neg', nodeId: null }, // Disconnected negative terminal
                    ],
                },
            ],
        };

        const result = simulateCircuit(circuit);

        expect(result.status).toBe('error');
        if (result.status === 'error') {
            expect(result.error.code).toBe('INCOMPLETE_VOLTAGE_SOURCE');
        }
    });

    it('Test G: Voltage-source polarity reversal flips node voltage and current signs consistently', () => {
        // Forward circuit: V1 pos -> A, neg -> B
        const forwardCircuit: Circuit = {
            id: 'forward',
            name: 'Forward',
            nodes: [
                { id: 'A', label: 'A' },
                { id: 'B', label: 'B' },
            ],
            components: [
                {
                    id: 'V1',
                    type: 'voltage_source',
                    value: 6,
                    terminals: [
                        { id: 'V1-pos', nodeId: 'A' },
                        { id: 'V1-neg', nodeId: 'B' },
                    ],
                },
                {
                    id: 'R1',
                    type: 'resistor',
                    value: 100,
                    terminals: [
                        { id: 'R1-a', nodeId: 'A' },
                        { id: 'R1-b', nodeId: 'B' },
                    ],
                },
            ],
        };

        // Reversed circuit: V1 pos -> B, neg -> A
        const reversedCircuit: Circuit = {
            id: 'reversed',
            name: 'Reversed',
            nodes: [
                { id: 'A', label: 'A' },
                { id: 'B', label: 'B' },
            ],
            components: [
                {
                    id: 'V1',
                    type: 'voltage_source',
                    value: 6,
                    terminals: [
                        { id: 'V1-pos', nodeId: 'B' },
                        { id: 'V1-neg', nodeId: 'A' },
                    ],
                },
                {
                    id: 'R1',
                    type: 'resistor',
                    value: 100,
                    terminals: [
                        { id: 'R1-a', nodeId: 'A' },
                        { id: 'R1-b', nodeId: 'B' },
                    ],
                },
            ],
        };

        const fwdResult = simulateCircuit(forwardCircuit);
        const revResult = simulateCircuit(reversedCircuit);

        expect(fwdResult.status).toBe('success');
        expect(revResult.status).toBe('success');

        if (fwdResult.status === 'success' && revResult.status === 'success') {
            // Forward: B is ground (0V), A is 6V
            expect(fwdResult.nodeVoltages['B']).toBe(0);
            expect(fwdResult.nodeVoltages['A']).toBe(6);
            expect(fwdResult.componentCurrents['R1']).toBeCloseTo(0.06, 4);

            // Reversed: A is ground (0V), B is 6V
            expect(revResult.nodeVoltages['A']).toBe(0);
            expect(revResult.nodeVoltages['B']).toBe(6);
            // R1 terminal A (0V) -> terminal B (6V): (0 - 6)/100 = -0.06 A
            expect(revResult.componentCurrents['R1']).toBeCloseTo(-0.06, 4);
        }
    });
});
