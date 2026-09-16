import type { Circuit, Component, ElectricalNode, TerminalConnection } from '../../shared/types';

export function getComponentById(circuit: Circuit, id: string): Component | undefined {
  return circuit.components.find((c) => c.id === id);
}

export function getNodeById(circuit: Circuit, id: string): ElectricalNode | undefined {
  return circuit.nodes.find((n) => n.id === id);
}

export function getConnectionsForNode(circuit: Circuit, nodeId: string): TerminalConnection[] {
  const connections: TerminalConnection[] = [];
  for (const component of circuit.components) {
    for (const terminal of component.terminals) {
      if (terminal.nodeId === nodeId) {
        connections.push({
          componentId: component.id,
          terminal
        });
      }
    }
  }
  return connections;
}
