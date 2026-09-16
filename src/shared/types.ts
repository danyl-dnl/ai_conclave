/**
 * Shared Circuit schema — canonical type contract for all four developers.
 *
 * FROZEN: Do not modify without explicit team approval.
 * AI agents must not unilaterally redesign these types (AGENTS.md §4).
 *
 * Seeded by Developer 2 to unblock parallel development on all branches.
 * If Developer 1 requires changes, stop and propose them explicitly.
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Identifies one terminal within a component (e.g. "A", "B", "positive", "negative"). */
export type TerminalId = string;

// ─── Node ─────────────────────────────────────────────────────────────────────

/** An electrical junction with no x/y coordinates. */
export interface CircuitNode {
  /** Stable identifier used for connectivity. */
  id: string;
  /** Optional human-readable label for display. Falls back to id when absent. */
  label?: string;
}

// ─── Terminal ─────────────────────────────────────────────────────────────────

/**
 * Maps one component terminal to an electrical node.
 * nodeId: null means the terminal is electrically disconnected.
 * This is the team-approved canonical disconnection representation.
 */
export interface TerminalConnection {
  terminalId: TerminalId;
  nodeId: string | null;
}

// ─── Components ───────────────────────────────────────────────────────────────

/** Safe MVP component kinds only. */
export type ComponentKind = 'resistor' | 'voltage-source';

/**
 * An ideal resistor with two terminals.
 * terminals[0] = terminal A, terminals[1] = terminal B.
 */
export interface Resistor {
  kind: 'resistor';
  id: string;
  resistanceOhms: number;
  terminals: [TerminalConnection, TerminalConnection];
}

/**
 * An ideal independent DC voltage source with two terminals.
 * terminals[0] = positive terminal, terminals[1] = negative terminal.
 * Polarity is ALWAYS determined by terminal position, not by label.
 */
export interface VoltageSource {
  kind: 'voltage-source';
  id: string;
  voltageVolts: number;
  terminals: [TerminalConnection, TerminalConnection];
}

/** Tagged union of all supported component types in the safe MVP. */
export type CircuitComponent = Resistor | VoltageSource;

// ─── Circuit ──────────────────────────────────────────────────────────────────

/**
 * The ONE canonical circuit representation used across all subsystems:
 * teacher review, student exploration, simulation, reconstruction,
 * structural verification, and evidence recording.
 *
 * Visual position is NOT part of this model (AGENTS.md §3).
 */
export interface Circuit {
  id: string;
  label: string;
  nodes: CircuitNode[];
  components: CircuitComponent[];
}
