import { useState, useRef, useEffect } from 'react';
import type { Circuit } from '../shared/types';
import {
  circuitOverview,
  componentDescription,
  nodeConnectionDescription,
  componentIds,
} from './circuitDescription';

interface ExploreProps {
  circuit: Circuit;
  onContinue: () => void;
}

type ExploreView = 'overview' | 'component' | 'node';

/**
 * Accessible circuit exploration screen.
 *
 * Three views:
 *   overview  — circuit summary + lists of components and nodes with "Explore" buttons
 *   component — detail view for one component, with Prev/Next navigation
 *   node      — connectivity view for one node
 *
 * All descriptions are generated from the Circuit model (no hard-coded text).
 * No drag-and-drop; all interactions use native buttons and selects.
 */
export default function Explore({ circuit, onContinue }: ExploreProps) {
  const [view, setView] = useState<ExploreView>('overview');
  const [componentIndex, setComponentIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Track where the node view was entered from, so Back works correctly.
  const [nodeEntryView, setNodeEntryView] = useState<'overview' | 'component'>('overview');

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard focus to the step heading whenever the view changes.
  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  const ids = componentIds(circuit);
  const currentComponentId = ids[componentIndex] ?? '';

  // ── Navigation helpers ───────────────────────────────────────────────────

  function openComponent(index: number) {
    setComponentIndex(index);
    setView('component');
  }

  function openNodeFrom(nodeId: string, from: 'overview' | 'component') {
    setSelectedNodeId(nodeId);
    setNodeEntryView(from);
    setView('node');
  }

  function prevComponent() {
    setComponentIndex((i) => (i - 1 + ids.length) % ids.length);
  }

  function nextComponent() {
    setComponentIndex((i) => (i + 1) % ids.length);
  }

  // ── Overview ─────────────────────────────────────────────────────────────

  if (view === 'overview') {
    return (
      <section className="student-step" aria-labelledby="explore-heading">
        <h2
          id="explore-heading"
          ref={headingRef}
          tabIndex={-1}
          className="student-step-heading"
        >
          Explore the Circuit
        </h2>

        <p className="student-circuit-overview">{circuitOverview(circuit)}</p>

        <div className="student-section">
          <h3>Components ({circuit.components.length})</h3>
          <ul className="student-item-list" aria-label="Circuit components">
            {circuit.components.map((comp, idx) => (
              <li key={comp.id}>
                <span className="student-item-label">{comp.id}</span>
                <button
                  id={`explore-btn-${comp.id}`}
                  type="button"
                  className="student-btn student-btn--secondary"
                  onClick={() => openComponent(idx)}
                >
                  Explore {comp.id}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="student-section">
          <h3>Electrical Nodes ({circuit.nodes.length})</h3>
          <ul className="student-item-list" aria-label="Electrical nodes">
            {circuit.nodes.map((node) => {
              const label = node.label ?? node.id;
              return (
                <li key={node.id}>
                  <span className="student-item-label">{label}</span>
                  <button
                    id={`explore-btn-node-${node.id}`}
                    type="button"
                    className="student-btn student-btn--secondary"
                    onClick={() => openNodeFrom(node.id, 'overview')}
                  >
                    Inspect {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="student-actions">
          <button
            id="explore-continue-btn"
            type="button"
            className="student-btn student-btn--primary"
            onClick={onContinue}
          >
            Continue to Prediction
          </button>
        </div>
      </section>
    );
  }

  // ── Component detail view ─────────────────────────────────────────────────

  if (view === 'component') {
    const desc = componentDescription(circuit, currentComponentId);
    const comp = circuit.components[componentIndex];

    // Unique connected node IDs for this component's terminals.
    const connectedNodeIds = comp
      ? [
          ...new Set(
            comp.terminals
              .filter((t) => t.nodeId !== null)
              .map((t) => t.nodeId as string)
          ),
        ]
      : [];

    const prevId = ids[(componentIndex - 1 + ids.length) % ids.length];
    const nextId = ids[(componentIndex + 1) % ids.length];

    return (
      <section className="student-step" aria-labelledby="component-heading">
        <h2
          id="component-heading"
          ref={headingRef}
          tabIndex={-1}
          className="student-step-heading"
        >
          Component: {currentComponentId}
        </h2>

        <p className="student-description">{desc}</p>

        {/* Prev / Next navigation */}
        <div className="student-actions student-actions--inline">
          <button
            type="button"
            className="student-btn student-btn--secondary"
            onClick={prevComponent}
            aria-label={`Previous component: ${prevId}`}
            disabled={ids.length <= 1}
          >
            ← Previous
          </button>
          <span className="student-count" aria-live="polite" aria-atomic="true">
            {componentIndex + 1} of {ids.length}
          </span>
          <button
            type="button"
            className="student-btn student-btn--secondary"
            onClick={nextComponent}
            aria-label={`Next component: ${nextId}`}
            disabled={ids.length <= 1}
          >
            Next →
          </button>
        </div>

        {/* Nodes connected to this component */}
        {connectedNodeIds.length > 0 && (
          <div className="student-section">
            <h3>Connected Nodes</h3>
            <ul className="student-item-list" aria-label="Nodes connected to this component">
              {connectedNodeIds.map((nodeId) => {
                const node = circuit.nodes.find((n) => n.id === nodeId);
                const label = node?.label ?? nodeId;
                return (
                  <li key={nodeId}>
                    <span className="student-item-label">{label}</span>
                    <button
                      type="button"
                      className="student-btn student-btn--secondary"
                      onClick={() => openNodeFrom(nodeId, 'component')}
                    >
                      Inspect {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="student-actions">
          <button
            type="button"
            className="student-btn student-btn--ghost"
            onClick={() => setView('overview')}
          >
            Back to Overview
          </button>
        </div>
      </section>
    );
  }

  // ── Node detail view ──────────────────────────────────────────────────────

  if (view === 'node') {
    const nodeId = selectedNodeId ?? '';
    const node = circuit.nodes.find((n) => n.id === nodeId);
    const label = node?.label ?? nodeId;
    const desc = nodeConnectionDescription(circuit, nodeId);

    return (
      <section className="student-step" aria-labelledby="node-heading">
        <h2
          id="node-heading"
          ref={headingRef}
          tabIndex={-1}
          className="student-step-heading"
        >
          {label}
        </h2>

        <p className="student-description">{desc}</p>

        <div className="student-actions">
          {nodeEntryView === 'component' && (
            <button
              type="button"
              className="student-btn student-btn--ghost"
              onClick={() => setView('component')}
            >
              Back to {currentComponentId}
            </button>
          )}
          <button
            type="button"
            className="student-btn student-btn--ghost"
            onClick={() => setView('overview')}
          >
            Back to Overview
          </button>
        </div>
      </section>
    );
  }

  return null;
}
