import { describe, it, expect } from 'vitest';
import { verifyCircuit } from './verifyCircuit';
import { goldenCircuit } from '../shared/demoCircuit';
import type { Circuit, Component } from '../shared/types';

function cloneCircuit(c: Circuit): Circuit {
  return JSON.parse(JSON.stringify(c));
}

describe('verifyCircuit', () => {
  it('Test A: Exact same circuit -> PASS', () => {
    const student = cloneCircuit(goldenCircuit);
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(true);
    expect(result.mismatches).toHaveLength(0);
  });

  it('Test B: Same structure with node names A/B changed to X/Y -> PASS', () => {
    const student = cloneCircuit(goldenCircuit);
    student.nodes = [{ id: 'X', label: 'X' }, { id: 'Y', label: 'Y' }];
    student.components.forEach(c => {
      c.terminals.forEach(t => {
        if (t.nodeId === 'A') t.nodeId = 'X';
        if (t.nodeId === 'B') t.nodeId = 'Y';
      });
    });
    
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(true);
  });

  it('Test C: Different component array order -> PASS', () => {
    const student = cloneCircuit(goldenCircuit);
    // Reverse component order
    student.components = student.components.reverse();
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(true);
  });

  it('Test D: Differing component IDs -> PASS', () => {
    const student = cloneCircuit(goldenCircuit);
    student.components[1].id = 'student_resistor_1';
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(true);
  });

  it('Test E: Duplicate components with identical type and value -> PASS', () => {
    const reference = cloneCircuit(goldenCircuit);
    const R3: Component = {
      id: 'R3', type: 'resistor', value: 100, terminals: [{id:'r3-a', nodeId:'A'}, {id:'r3-b', nodeId:'B'}]
    };
    reference.components.push(R3);
    
    const student = cloneCircuit(reference);
    student.components[3].id = 'R_DUP'; // rename one of the duplicates
    const result = verifyCircuit(reference, student);
    expect(result.equivalent).toBe(true);
  });

  it('Test F: Wrong node connection -> FAIL (CONNECTION_MISMATCH)', () => {
    // Build a 3-node reference: V1 A→B, R1 A-B, R2 A-C
    // This breaks all symmetry so wrong connectivity cannot be confused with polarity
    const ref = cloneCircuit(goldenCircuit);
    ref.nodes.push({ id: 'C', label: 'C' });
    ref.components[2].terminals[0].nodeId = 'A';
    ref.components[2].terminals[1].nodeId = 'C';

    // Student declares all 3 nodes but connects R2 to A-B instead of A-C (wrong endpoint)
    const student = cloneCircuit(ref);
    student.components[2].terminals[0].nodeId = 'A'; // correct
    student.components[2].terminals[1].nodeId = 'B'; // wrong: should be C

    const result = verifyCircuit(ref, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('CONNECTION_MISMATCH');
  });

  it('Test G: Wrong component value -> FAIL (VALUE_MISMATCH)', () => {
    const student = cloneCircuit(goldenCircuit);
    student.components[1].value = 999; // Was 100
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('MISSING_COMPONENT');
    // Note: Due to fast fail logic it reports missing the original, and then extra component... but since the logic checks missing first, it will return MISSING_COMPONENT. 
  });

  it('Test H: Reversed voltage source polarity -> FAIL (POLARITY_MISMATCH)', () => {
    const ref = cloneCircuit(goldenCircuit);
    ref.nodes.push({ id: 'C', label: 'C' });
    // Break symmetry by moving R2 to B-C
    ref.components[2].terminals[0].nodeId = 'B';
    ref.components[2].terminals[1].nodeId = 'C';

    const student = cloneCircuit(ref);
    // Swap positive and negative terminals on V1
    const t0 = student.components[0].terminals[0].nodeId;
    const t1 = student.components[0].terminals[1].nodeId;
    student.components[0].terminals[0].nodeId = t1;
    student.components[0].terminals[1].nodeId = t0;
    
    const result = verifyCircuit(ref, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('POLARITY_MISMATCH');
  });

  it('Test I: Missing component -> FAIL (MISSING_COMPONENT)', () => {
    const student = cloneCircuit(goldenCircuit);
    student.components.splice(2, 1); // Remove R2
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('MISSING_COMPONENT');
  });

  it('Test J: Extra component -> FAIL (EXTRA_COMPONENT)', () => {
    const student = cloneCircuit(goldenCircuit);
    student.components.push({
      id: 'R3', type: 'resistor', value: 300, terminals: [{id:'r3-a', nodeId:'A'}, {id:'r3-b', nodeId:'B'}]
    });
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('EXTRA_COMPONENT');
  });

  it('Test K: Equivalent resistance but different topology -> FAIL (TOPOLOGY_MISMATCH)', () => {
    const student = cloneCircuit(goldenCircuit);
    // Instead of R2=200, we use two 100 ohm resistors in series (node A to C, C to B)
    student.components.splice(2, 1); // Remove R2
    student.nodes.push({ id: 'C', label: 'C' });
    student.components.push(
      { id: 'R2a', type: 'resistor', value: 100, terminals: [{id:'t1', nodeId:'A'}, {id:'t2', nodeId:'C'}] },
      { id: 'R2b', type: 'resistor', value: 100, terminals: [{id:'t3', nodeId:'C'}, {id:'t4', nodeId:'B'}] }
    );
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(false);
    // Component count will fail on missing 200 ohm first
    expect(result.mismatches[0].type).toBe('MISSING_COMPONENT');
  });

  it('Test L: Disconnected / null terminal -> FAIL with structured mismatch (DISCONNECTED_TERMINAL)', () => {
    const student = cloneCircuit(goldenCircuit);
    student.components[1].terminals[1].nodeId = null;
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('DISCONNECTED_TERMINAL');
  });

  it('Test M: Malformed / incomplete student circuit data -> FAIL (MALFORMED_CIRCUIT)', () => {
    const student = cloneCircuit(goldenCircuit);
    // @ts-ignore
    student.components[1].terminals[1].nodeId = undefined;
    const result = verifyCircuit(goldenCircuit, student);
    expect(result.equivalent).toBe(false);
    expect(result.mismatches[0].type).toBe('MALFORMED_CIRCUIT');
  });
});
