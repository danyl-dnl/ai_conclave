import * as math from 'mathjs';
import type { Circuit } from '../shared/types';
import type { SimulationResult } from './types';
import { createSimulationError } from './errors';

export function solveMNA(circuit: Circuit): SimulationResult {
    const validNodeIds = new Set(circuit.nodes.map((n) => n.id));

    // 1. Validate node references and components
    for (const component of circuit.components) {
        if (component.type !== 'resistor' && component.type !== 'voltage_source') {
            return createSimulationError(
                'UNSUPPORTED_COMPONENT',
                `Unsupported component type: '${component.type}'`
            );
        }

        // Check terminal node existence if connected
        for (const terminal of component.terminals) {
            if (terminal.nodeId !== null && !validNodeIds.has(terminal.nodeId)) {
                return createSimulationError(
                    'UNKNOWN_NODE',
                    `Terminal '${terminal.id}' references non-existent node '${terminal.nodeId}'`,
                    { componentId: component.id, nodeId: terminal.nodeId }
                );
            }
        }

        if (component.type === 'voltage_source') {
            const [pos, neg] = component.terminals;
            if (pos.nodeId === null || neg.nodeId === null) {
                return createSimulationError(
                    'INCOMPLETE_VOLTAGE_SOURCE',
                    `Voltage source '${component.id}' has one or more disconnected/unassigned terminals.`
                );
            }
            if (pos.nodeId === neg.nodeId) {
                return createSimulationError(
                    'CONTRADICTORY_SOURCES',
                    `Voltage source '${component.id}' has positive and negative terminals shorted to the same node '${pos.nodeId}'.`
                );
            }
        }

        if (component.type === 'resistor') {
            if (typeof component.value !== 'number' || Number.isNaN(component.value) || component.value <= 0) {
                return createSimulationError(
                    'INVALID_RESISTANCE',
                    `Resistor '${component.id}' has invalid resistance value: ${component.value}`
                );
            }
        }
    }

    // 2. Identify reference node (Ground = 0V)
    const voltageSources = circuit.components.filter(
        (c) => c.type === 'voltage_source'
    );

    let refNodeId: string | null = null;
    if (voltageSources.length > 0) {
        // Prefer negative terminal of first voltage source
        refNodeId = voltageSources[0].terminals[1].nodeId;
    }

    if (!refNodeId && circuit.nodes.length > 0) {
        // Fallback: pick node with most terminal connections or first node
        const connectionCounts = new Map<string, number>();
        for (const node of circuit.nodes) {
            connectionCounts.set(node.id, 0);
        }
        for (const comp of circuit.components) {
            for (const t of comp.terminals) {
                if (t.nodeId && connectionCounts.has(t.nodeId)) {
                    connectionCounts.set(t.nodeId, (connectionCounts.get(t.nodeId) || 0) + 1);
                }
            }
        }
        let maxCount = -1;
        for (const [nodeId, count] of connectionCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                refNodeId = nodeId;
            }
        }
    }

    if (!refNodeId) {
        return createSimulationError('SINGULAR_CIRCUIT', 'No valid nodes found in circuit.');
    }

    // 3. Map non-reference nodes to matrix indices 0..N-1
    const nonRefNodes = circuit.nodes
        .map((n) => n.id)
        .filter((id) => id !== refNodeId);

    const nodeMap = new Map<string, number>();
    nonRefNodes.forEach((id, index) => {
        nodeMap.set(id, index);
    });

    const N = nonRefNodes.length; // Number of unknown node voltages
    const K = voltageSources.length; // Number of voltage sources

    // If no voltage sources and no resistors, return empty/zero
    if (N === 0 && K === 0) {
        const nodeVoltages: Record<string, number> = {};
        if (refNodeId) nodeVoltages[refNodeId] = 0;
        return {
            status: 'success',
            nodeVoltages,
            componentCurrents: {},
        };
    }

    const matrixSize = N + K;
    const A: number[][] = Array.from({ length: matrixSize }, () =>
        Array(matrixSize).fill(0)
    );
    const z: number[] = Array(matrixSize).fill(0);

    // 4. Stamp Resistors
    for (const component of circuit.components) {
        if (component.type !== 'resistor') continue;
        const [t1, t2] = component.terminals;
        if (t1.nodeId === null || t2.nodeId === null) {
            // Disconnected resistor branch: carries 0 A, omitted from matrix stamping
            continue;
        }

        const u = nodeMap.get(t1.nodeId);
        const v = nodeMap.get(t2.nodeId);
        const G = 1 / component.value;

        if (u !== undefined) A[u][u] += G;
        if (v !== undefined) A[v][v] += G;
        if (u !== undefined && v !== undefined) {
            A[u][v] -= G;
            A[v][u] -= G;
        }
    }

    // 5. Stamp Voltage Sources
    for (let k = 0; k < K; k++) {
        const source = voltageSources[k];
        const [pos, neg] = source.terminals;
        const posNodeId = pos.nodeId!;
        const negNodeId = neg.nodeId!;

        const p = nodeMap.get(posNodeId);
        const m = nodeMap.get(negNodeId);

        const rowIdx = N + k;

        // Voltage constraint: V_pos - V_neg = V_src
        if (p !== undefined) A[rowIdx][p] = 1;
        if (m !== undefined) A[rowIdx][m] = -1;
        z[rowIdx] = source.value;

        // KCL contributions (auxiliary current variable column)
        if (p !== undefined) A[p][rowIdx] = 1;
        if (m !== undefined) A[m][rowIdx] = -1;
    }

    // 6. Solve Linear System A * x = z
    let x: number[];
    try {
        const solution = math.lusolve(A, z);
        // solution is a 2D array matrix [[x0], [x1], ...] or MathArray
        const flatSolution = Array.isArray(solution)
            ? solution.map((row: unknown) => (Array.isArray(row) ? Number(row[0]) : Number(row)))
            : (solution as any).toArray().map((row: any) => Number(row[0]));

        if (flatSolution.some((val: number) => Number.isNaN(val) || !Number.isFinite(val))) {
            return createSimulationError(
                'SINGULAR_CIRCUIT',
                'Circuit matrix solution contained invalid or non-finite values.'
            );
        }
        x = flatSolution;
    } catch {
        return createSimulationError(
            'SINGULAR_CIRCUIT',
            'Circuit cannot be uniquely solved (singular matrix or contradictory constraints).'
        );
    }

    // 7. Extract Node Voltages
    const nodeVoltages: Record<string, number> = {};
    nodeVoltages[refNodeId] = 0; // Reference node voltage is 0V

    nonRefNodes.forEach((id, index) => {
        nodeVoltages[id] = x[index];
    });

    // 8. Calculate Component Currents
    const componentCurrents: Record<string, number> = {};

    for (const component of circuit.components) {
        if (component.type === 'resistor') {
            const [t1, t2] = component.terminals;
            if (t1.nodeId === null || t2.nodeId === null) {
                componentCurrents[component.id] = 0;
            } else {
                const v1 = nodeVoltages[t1.nodeId] ?? 0;
                const v2 = nodeVoltages[t2.nodeId] ?? 0;
                // Signed resistor current t1 -> t2
                componentCurrents[component.id] = (v1 - v2) / component.value;
            }
        } else if (component.type === 'voltage_source') {
            const k = voltageSources.findIndex((vs) => vs.id === component.id);
            if (k !== -1) {
                // Internal MNA current x[N+k] flows into positive terminal
                // Public convention: positive current leaving positive terminal into external circuit
                const iMNA = x[N + k];
                componentCurrents[component.id] = -iMNA;
            }
        }
    }

    return {
        status: 'success',
        nodeVoltages,
        componentCurrents,
    };
}
