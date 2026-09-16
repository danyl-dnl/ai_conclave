import type { Circuit, ValidationResult, ValidationError } from '../../shared/types';

export function validateCircuit(circuit: Circuit): ValidationResult {
  const errors: ValidationError[] = [];

  const addError = (code: string, message: string, componentId?: string, nodeId?: string, terminalId?: string) => {
    errors.push({ code, message, componentId, nodeId, terminalId });
  };

  // 1. Check duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of circuit.nodes) {
    if (nodeIds.has(node.id)) {
      addError('DUPLICATE_NODE_ID', `Duplicate node ID: ${node.id}`, undefined, node.id);
    }
    nodeIds.add(node.id);
  }

  // 2. Check duplicate component IDs
  const componentIds = new Set<string>();
  for (const comp of circuit.components) {
    if (componentIds.has(comp.id)) {
      addError('DUPLICATE_COMPONENT_ID', `Duplicate component ID: ${comp.id}`, comp.id);
    }
    componentIds.add(comp.id);

    // 3. Check unsupported component types
    if (comp.type !== 'resistor' && comp.type !== 'voltage_source') {
      addError('UNSUPPORTED_COMPONENT', `Unsupported component type: ${comp.type}`, comp.id);
    }

    // 4. Incorrect terminal count
    if (!comp.terminals || comp.terminals.length !== 2) {
      addError('INVALID_TERMINAL_COUNT', `Component ${comp.id} must have exactly 2 terminals`, comp.id);
    } else {
      // 5. Check duplicate terminal IDs within the circuit
      // Actually, we could check global terminal ID uniqueness, but usually it's unique within component.
      if (comp.terminals[0].id === comp.terminals[1].id) {
        addError('DUPLICATE_TERMINAL_ID', `Duplicate terminal ID ${comp.terminals[0].id} in component ${comp.id}`, comp.id, undefined, comp.terminals[0].id);
      }

      // 6. Terminal references to nonexistent nodes
      for (const terminal of comp.terminals) {
        if (terminal.nodeId !== null) {
          if (!nodeIds.has(terminal.nodeId)) {
            addError('NONEXISTENT_NODE', `Terminal ${terminal.id} of component ${comp.id} references nonexistent node ${terminal.nodeId}`, comp.id, terminal.nodeId, terminal.id);
          }
        }
      }
    }

    // 7. Invalid/non-finite component values
    if (typeof comp.value !== 'number' || !isFinite(comp.value)) {
      addError('INVALID_VALUE', `Component ${comp.id} has invalid/non-finite value`, comp.id);
    } else {
      // 8. Resistor resistance <= 0
      if (comp.type === 'resistor' && comp.value <= 0) {
        addError('INVALID_RESISTANCE', `Resistor ${comp.id} must have a resistance > 0`, comp.id);
      }
    }

    // 9. Malformed voltage source data (e.g. invalid voltage, which is checked by the non-finite check, but can be 0 or negative which is physically fine).
  }

  // Check duplicate terminal IDs globally if required by contract.
  const globalTerminalIds = new Set<string>();
  for (const comp of circuit.components) {
    if (comp.terminals && comp.terminals.length > 0) {
      for (const t of comp.terminals) {
        if (globalTerminalIds.has(t.id)) {
          addError('DUPLICATE_TERMINAL_ID', `Terminal ID ${t.id} is duplicated across components`, comp.id, undefined, t.id);
        }
        globalTerminalIds.add(t.id);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
