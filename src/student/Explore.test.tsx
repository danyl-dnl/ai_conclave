// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Explore from './Explore';
import type { Circuit } from '../shared/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const testCircuit: Circuit = {
  id: 'test',
  name: 'Test Parallel Circuit',
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

// Ensure DOM is cleared between tests (no global vitest setup file in this project).
afterEach(cleanup);

// ─── Overview ─────────────────────────────────────────────────────────────────

describe('Explore — Overview', () => {
  it('renders the circuit label in the overview', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    expect(screen.getByText(/Test Parallel Circuit/i)).toBeInTheDocument();
  });

  it('renders an explore button for each component', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    expect(screen.getByRole('button', { name: /Explore V1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore R1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore R2/i })).toBeInTheDocument();
  });

  it('renders an inspect button for each node', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    expect(screen.getByRole('button', { name: /Inspect Node A/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inspect Node B/i })).toBeInTheDocument();
  });

  it('renders a Continue button', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    expect(
      screen.getByRole('button', { name: /Continue to Prediction/i })
    ).toBeInTheDocument();
  });

  it('calls onContinue when Continue is clicked', () => {
    const onContinue = vi.fn();
    render(<Explore circuit={testCircuit} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue to Prediction/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

// ─── Component view ───────────────────────────────────────────────────────────

describe('Explore — Component view', () => {
  it('navigates to the component view when Explore R1 is clicked', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Explore R1/i }));
    // Component heading should now be visible.
    expect(screen.getByRole('heading', { name: /Component: R1/i })).toBeInTheDocument();
  });

  it('shows the resistor description including ohms', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Explore R1/i }));
    expect(screen.getByText(/100 ohms/i)).toBeInTheDocument();
  });

  it('shows a Back to Overview button in the component view', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Explore R1/i }));
    expect(
      screen.getByRole('button', { name: /Back to Overview/i })
    ).toBeInTheDocument();
  });

  it('returns to overview when Back to Overview is clicked', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Explore R1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back to Overview/i }));
    expect(screen.getByRole('heading', { name: /Explore the Circuit/i })).toBeInTheDocument();
  });

  it('shows Prev / Next buttons in the component view', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Explore R1/i }));
    expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('navigates to the next component with Next button', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    // Open V1 (index 0), then click Next to reach R1 (index 1).
    fireEvent.click(screen.getByRole('button', { name: /Explore V1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByRole('heading', { name: /Component: R1/i })).toBeInTheDocument();
  });
});

// ─── Node view ────────────────────────────────────────────────────────────────

describe('Explore — Node view', () => {
  it('navigates to the node view when Inspect Node A is clicked from overview', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Inspect Node A/i }));
    expect(screen.getByRole('heading', { name: /Node A/i })).toBeInTheDocument();
  });

  it('shows connectivity description for Node A', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Inspect Node A/i }));
    // Should mention V1, R1, R2 which are all on Node A.
    const desc = screen.getByText(/connected to/i);
    expect(desc.textContent).toMatch(/V1/);
    expect(desc.textContent).toMatch(/R1/);
    expect(desc.textContent).toMatch(/R2/);
  });

  it('returns to overview when Back to Overview is clicked from node view', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Inspect Node A/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back to Overview/i }));
    expect(screen.getByRole('heading', { name: /Explore the Circuit/i })).toBeInTheDocument();
  });

  it('shows Back to [Component] button when entering node from component view', () => {
    render(<Explore circuit={testCircuit} onContinue={() => undefined} />);
    // Navigate: Overview → R1 component view → Node A node view.
    fireEvent.click(screen.getByRole('button', { name: /Explore R1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Inspect Node A/i }));
    // Should have a "Back to R1" button.
    expect(
      screen.getByRole('button', { name: /Back to R1/i })
    ).toBeInTheDocument();
  });
});
