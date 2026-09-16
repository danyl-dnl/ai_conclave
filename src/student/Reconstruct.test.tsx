// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Reconstruct from './Reconstruct';
import type { Circuit } from '../shared/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const referenceCircuit: Circuit = {
  id: 'ref',
  name: 'Parallel Resistor Circuit',
  nodes: [
    { id: 'A', label: 'Node A' },
    { id: 'B', label: 'Node B' },
  ],
  components: [
    {
      type: 'voltage_source',
      id: 'V1',
      value: 6,
      terminals: [
        { id: 'positive', nodeId: 'A' },
        { id: 'negative', nodeId: 'B' },
      ],
    },
    {
      type: 'resistor',
      id: 'R1',
      value: 100,
      terminals: [
        { id: 'A', nodeId: 'A' },
        { id: 'B', nodeId: 'B' },
      ],
    },
    {
      type: 'resistor',
      id: 'R2',
      value: 200,
      terminals: [
        { id: 'A', nodeId: 'A' },
        { id: 'B', nodeId: 'B' },
      ],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addNode(label: string) {
  const input = screen.getByLabelText(/New node label/i);
  fireEvent.change(input, { target: { value: label } });
  fireEvent.click(screen.getByRole('button', { name: /Add Node/i }));
}

function addResistor() {
  fireEvent.click(screen.getByRole('button', { name: /\+ Resistor/i }));
}

function addVoltageSource() {
  fireEvent.click(screen.getByRole('button', { name: /\+ Voltage Source/i }));
}

// Ensure DOM is cleared between tests (no global vitest setup file in this project).
afterEach(cleanup);

// ─── Node creation ────────────────────────────────────────────────────────────

describe('Reconstruct — Node creation', () => {
  it('renders the Add Node button', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: /Add Node/i })).toBeInTheDocument();
  });

  it('creates a node with an arbitrary label (not forced to A or B)', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addNode('X');
    expect(screen.getByText(/Node: X/i)).toBeInTheDocument();
  });

  it('creates multiple nodes with different labels', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addNode('X');
    addNode('Y');
    expect(screen.getByText(/Node: X/i)).toBeInTheDocument();
    expect(screen.getByText(/Node: Y/i)).toBeInTheDocument();
  });

  it('rejects duplicate node labels', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addNode('X');
    addNode('X'); // duplicate
    // Error message should appear.
    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('rejects an empty node label', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Add Node/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot be empty/i);
  });

  it('removes a node when its Remove button is clicked', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addNode('X');
    fireEvent.click(screen.getByRole('button', { name: /Remove node X/i }));
    expect(screen.queryByText(/Node: X/i)).not.toBeInTheDocument();
  });
});

// ─── Component management ─────────────────────────────────────────────────────

describe('Reconstruct — Component management', () => {
  it('adds a resistor card when + Resistor is clicked', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addResistor();
    expect(screen.getByText('Resistor')).toBeInTheDocument();
    expect(screen.getByLabelText(/Resistance \(ohms\)/i)).toBeInTheDocument();
  });

  it('adds a voltage source card when + Voltage Source is clicked', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addVoltageSource();
    expect(screen.getByText('Voltage Source')).toBeInTheDocument();
    expect(screen.getByLabelText(/Voltage \(volts\)/i)).toBeInTheDocument();
  });

  it('shows positive and negative terminal selects for a voltage source', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addVoltageSource();
    expect(screen.getByLabelText(/Positive terminal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Negative terminal/i)).toBeInTheDocument();
  });

  it('shows terminal A and terminal B selects for a resistor', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addResistor();
    expect(screen.getByLabelText(/Terminal A/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Terminal B/i)).toBeInTheDocument();
  });
});

// ─── Submission ───────────────────────────────────────────────────────────────

describe('Reconstruct — Submission', () => {
  it('blocks submission with no nodes', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addResistor();
    fireEvent.click(screen.getByRole('button', { name: /Submit Reconstruction/i }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/at least one.*node/i);
  });

  it('blocks submission with no components', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addNode('X');
    fireEvent.click(screen.getByRole('button', { name: /Submit Reconstruction/i }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/at least one.*component/i);
  });

  it('blocks submission with an empty component ID', () => {
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={() => undefined}
        onBack={() => undefined}
      />
    );
    addNode('X');
    addResistor();
    // Fill in resistance but leave ID empty.
    const resistanceInput = screen.getByLabelText(/Resistance \(ohms\)/i);
    fireEvent.change(resistanceInput, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Reconstruction/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/missing an ID/i);
  });

  it('calls onSubmit with a Circuit using the student-chosen node IDs (not A/B)', () => {
    const onSubmit = vi.fn();
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={onSubmit}
        onBack={() => undefined}
      />
    );

    // Create nodes X and Y.
    addNode('X');
    addNode('Y');

    // Add a resistor.
    addResistor();
    fireEvent.change(screen.getByLabelText(/Component ID/i), {
      target: { value: 'R1' },
    });
    fireEvent.change(screen.getByLabelText(/Resistance \(ohms\)/i), {
      target: { value: '100' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Reconstruction/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const submitted: Circuit = onSubmit.mock.calls[0][0];

    // Output circuit must use X and Y, not A and B.
    const nodeIds = submitted.nodes.map((n) => n.id);
    expect(nodeIds).toContain('X');
    expect(nodeIds).toContain('Y');
    expect(nodeIds).not.toContain('A');
    expect(nodeIds).not.toContain('B');
  });

  it('submitted circuit conforms to the Circuit shape', () => {
    const onSubmit = vi.fn();
    render(
      <Reconstruct
        referenceCircuit={referenceCircuit}
        onSubmit={onSubmit}
        onBack={() => undefined}
      />
    );

    addNode('P');
    addNode('Q');
    addVoltageSource();

    // Fill voltage source.
    fireEvent.change(screen.getByLabelText(/Component ID/i), {
      target: { value: 'V1' },
    });
    fireEvent.change(screen.getByLabelText(/Voltage \(volts\)/i), {
      target: { value: '6' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Reconstruction/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const submitted: Circuit = onSubmit.mock.calls[0][0];

    // Must have id, name, nodes, components.
    expect(typeof submitted.id).toBe('string');
    expect(typeof submitted.name).toBe('string');
    expect(Array.isArray(submitted.nodes)).toBe(true);
    expect(Array.isArray(submitted.components)).toBe(true);

    // Component must have correct shape.
    const comp = submitted.components[0];
    expect(comp.type).toBe('voltage_source');
    expect(comp.id).toBe('V1');
    expect(Array.isArray(comp.terminals)).toBe(true);
    expect(comp.terminals).toHaveLength(2);
  });
});
