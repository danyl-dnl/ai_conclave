import type { Circuit } from '../shared/types';
import type { SimulationResult } from './types';
import { solveMNA } from './mna';

/**
 * Public simulation entry point for AccessGraph circuits.
 * Solves DC circuits containing resistors and ideal DC voltage sources.
 *
 * @param circuit Canonical Circuit data structure
 * @returns SimulationResult containing node voltages, component currents, or structured errors
 */
export function simulateCircuit(circuit: Circuit): SimulationResult {
    return solveMNA(circuit);
}
