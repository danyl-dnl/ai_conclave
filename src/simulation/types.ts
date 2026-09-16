

export interface SimulationSuccessResult {
  status: 'success';
  nodeVoltages: Record<string, number>; // nodeId -> voltage (V)
  componentCurrents: Record<string, number>; // componentId -> signed current (A)
}

export interface SimulationErrorDetails {
  code:
  | 'UNKNOWN_NODE'
  | 'UNSUPPORTED_COMPONENT'
  | 'INVALID_RESISTANCE'
  | 'INCOMPLETE_VOLTAGE_SOURCE'
  | 'SINGULAR_CIRCUIT'
  | 'FLOATING_NETWORK'
  | 'CONTRADICTORY_SOURCES';
  message: string;
  details?: Record<string, unknown>;
}

export interface SimulationErrorResult {
  status: 'error';
  error: SimulationErrorDetails;
}

export type SimulationResult = SimulationSuccessResult | SimulationErrorResult;
