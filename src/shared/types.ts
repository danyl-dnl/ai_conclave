export type ComponentType = 'resistor' | 'voltage_source';

export interface Terminal {
  id: string;
  // null represents an intentionally disconnected terminal
  nodeId: string | null;
}

export interface Component {
  id: string;
  type: ComponentType;
  value: number; // Ohms for resistors, Volts for voltage sources
  // For resistor: [terminalA, terminalB]
  // For voltage_source: [positiveTerminal, negativeTerminal]
  terminals: [Terminal, Terminal];
}

export interface ElectricalNode {
  id: string;
  label?: string; // Optional user-facing label
}

export interface Circuit {
  id: string;
  name: string;
  components: Component[];
  nodes: ElectricalNode[];
}

export interface TerminalConnection {
  componentId: string;
  terminal: Terminal;
}

export interface ValidationError {
  code: string;
  message: string;
  componentId?: string;
  nodeId?: string;
  terminalId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
