import type { SimulationErrorResult, SimulationErrorDetails } from './types';

export function createSimulationError(
    code: SimulationErrorDetails['code'],
    message: string,
    details?: Record<string, unknown>
): SimulationErrorResult {
    return {
        status: 'error',
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
    };
}
