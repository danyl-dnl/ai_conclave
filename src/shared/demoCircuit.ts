import type { Circuit } from './types';

export const goldenCircuit: Circuit = {
  id: 'golden-demo-circuit',
  name: 'Golden Test Circuit',
  nodes: [
    { id: 'A', label: 'A' },
    { id: 'B', label: 'B' }
  ],
  components: [
    {
      id: 'V1',
      type: 'voltage_source',
      value: 6,
      terminals: [
        { id: 'V1-pos', nodeId: 'A' },
        { id: 'V1-neg', nodeId: 'B' }
      ]
    },
    {
      id: 'R1',
      type: 'resistor',
      value: 100,
      terminals: [
        { id: 'R1-a', nodeId: 'A' },
        { id: 'R1-b', nodeId: 'B' }
      ]
    },
    {
      id: 'R2',
      type: 'resistor',
      value: 200,
      terminals: [
        { id: 'R2-a', nodeId: 'A' },
        { id: 'R2-b', nodeId: 'B' }
      ]
    }
  ]
};
