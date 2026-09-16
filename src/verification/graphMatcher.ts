import type { Circuit, Component } from '../shared/types';
import type { VerificationResult } from './verifyCircuit';

export function checkStructuralEquivalence(ref: Circuit, stu: Circuit): VerificationResult {
  // 1. Fast-fail on component type+value count mismatches
  const refCounts = getComponentCounts(ref.components);
  const stuCounts = getComponentCounts(stu.components);

  for (const [key, refCount] of Object.entries(refCounts)) {
    const stuCount = stuCounts[key] || 0;
    if (stuCount < refCount) {
      const [type, value] = key.split(':');
      return {
        equivalent: false,
        mismatches: [{
          type: 'MISSING_COMPONENT',
          message: `Missing component: Expected a ${type} with value ${value}.`
        }]
      };
    }
  }

  for (const [key, stuCount] of Object.entries(stuCounts)) {
    const refCount = refCounts[key] || 0;
    if (stuCount > refCount) {
      const [type, value] = key.split(':');
      const extraComponent = stu.components.find(c => `${c.type}:${c.value}` === key);
      return {
        equivalent: false,
        mismatches: [{
          type: 'EXTRA_COMPONENT',
          message: `Extra component found: A ${type} with value ${value} is not present in the reference circuit.`,
          componentId: extraComponent?.id
        }]
      };
    }
  }

  // 2. Collect distinct node IDs from the declared node list
  const refNodes = ref.nodes.map(n => n.id);
  const stuNodes = stu.nodes.map(n => n.id);

  if (refNodes.length !== stuNodes.length) {
    return {
      equivalent: false,
      mismatches: [{
        type: 'TOPOLOGY_MISMATCH',
        message: 'Circuit topology does not match the required reference structure (node count differs).'
      }]
    };
  }

  // 3. Try every bijection (refNodes permutation), mapping stuNodes[i] -> permutation[i]
  const bijections = generatePermutations(refNodes);

  // Track the best result found across bijections.
  // Priority order (highest first): POLARITY_MISMATCH > CONNECTION_MISMATCH > TOPOLOGY_MISMATCH
  let bestMatchCount = -1;
  let bestPolarityMatch: VerificationResult | null = null;
  let bestConnectionMismatch: VerificationResult | null = null;

  for (const refMapping of bijections) {
    // Build bijection map: student_node -> reference_node
    const mapStuToRef = new Map<string, string>();
    for (let i = 0; i < stuNodes.length; i++) {
      mapStuToRef.set(stuNodes[i], refMapping[i]);
    }

    const result = evaluateMapping(ref.components, stu.components, mapStuToRef);

    if (result.exactMatched === ref.components.length) {
      // Perfect structural match — equivalent
      return { equivalent: true, mismatches: [] };
    }

    // A bijection's quality is its exact match count.
    // Among bijections with equal exact matches, prefer polarity over connection.
    if (result.exactMatched > bestMatchCount) {
      bestMatchCount = result.exactMatched;
      // Reset: this is a better bijection, override previous mismatch candidates
      bestPolarityMatch = result.polarityMismatch;
      bestConnectionMismatch = result.connectionMismatch;
    } else if (result.exactMatched === bestMatchCount) {
      // Equal quality bijection — polarity takes priority over connection
      if (result.polarityMismatch !== null && bestPolarityMatch === null) {
        bestPolarityMatch = result.polarityMismatch;
      }
      if (result.connectionMismatch !== null && bestConnectionMismatch === null) {
        bestConnectionMismatch = result.connectionMismatch;
      }
    }
  }

  // Return: if the best bijection found a polarity mismatch, report that.
  // Otherwise report the connection mismatch from the best bijection.
  if (bestPolarityMatch !== null) {
    return bestPolarityMatch;
  }
  if (bestConnectionMismatch !== null) {
    return bestConnectionMismatch;
  }

  return {
    equivalent: false,
    mismatches: [{
      type: 'TOPOLOGY_MISMATCH',
      message: 'Circuit topology does not match the required reference structure.'
    }]
  };
}

function getComponentCounts(components: Component[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of components) {
    const key = `${c.type}:${c.value}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function generatePermutations(arr: string[]): string[][] {
  if (arr.length <= 1) return [arr];
  const perms: string[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of generatePermutations(remaining)) {
      perms.push([current, ...p]);
    }
  }
  return perms;
}

interface MappingResult {
  /** Components that matched exactly (correct type, value, connectivity, polarity) */
  exactMatched: number;
  /** Voltage sources that matched type+value+connectivity but with reversed polarity */
  polarityMatched: number;
  /** First polarity reversal found under this bijection */
  polarityMismatch: VerificationResult | null;
  /** First unresolvable connection mismatch under this bijection */
  connectionMismatch: VerificationResult | null;
}

function evaluateMapping(
  refComps: Component[],
  stuComps: Component[],
  mapStuToRef: Map<string, string>
): MappingResult {
  let exactMatched = 0;
  let polarityMatched = 0;
  const usedRefIds = new Set<string>();
  let polarityMismatch: VerificationResult | null = null;
  let connectionMismatch: VerificationResult | null = null;

  for (const stuC of stuComps) {
    let foundExact = false;
    let foundReversed = false;
    let reversedRefId: string | null = null;

    for (const refC of refComps) {
      if (usedRefIds.has(refC.id)) continue;
      if (refC.type !== stuC.type || refC.value !== stuC.value) continue;

      const m0 = mapStuToRef.get(stuC.terminals[0].nodeId as string);
      const m1 = mapStuToRef.get(stuC.terminals[1].nodeId as string);

      if (stuC.type === 'resistor') {
        // Resistors are bidirectional — terminal order irrelevant
        const isMatch =
          (m0 === refC.terminals[0].nodeId && m1 === refC.terminals[1].nodeId) ||
          (m0 === refC.terminals[1].nodeId && m1 === refC.terminals[0].nodeId);
        if (isMatch) {
          usedRefIds.add(refC.id);
          exactMatched++;
          foundExact = true;
          break;
        }
      } else if (stuC.type === 'voltage_source') {
        // terminals[0] = positive, terminals[1] = negative — order matters
        const isExact   = m0 === refC.terminals[0].nodeId && m1 === refC.terminals[1].nodeId;
        const isReversed = m0 === refC.terminals[1].nodeId && m1 === refC.terminals[0].nodeId;

        if (isExact) {
          usedRefIds.add(refC.id);
          exactMatched++;
          foundExact = true;
          break;
        } else if (isReversed && !foundReversed) {
          foundReversed = true;
          reversedRefId = refC.id;
          // Do NOT break — keep scanning for an exact match first
        }
      }
    }

    if (!foundExact) {
      if (foundReversed && reversedRefId !== null) {
        // Polarity reversal: consume the ref component so it isn't double-matched
        usedRefIds.add(reversedRefId);
        polarityMatched++;
        if (polarityMismatch === null) {
          polarityMismatch = {
            equivalent: false,
            mismatches: [{
              type: 'POLARITY_MISMATCH',
              message: 'Voltage source polarity is reversed relative to the reference circuit.',
              componentId: stuC.id
            }]
          };
        }
      } else {
        if (connectionMismatch === null) {
          connectionMismatch = {
            equivalent: false,
            mismatches: [{
              type: 'CONNECTION_MISMATCH',
              message: `${stuC.type} is connected to different electrical nodes than the corresponding reference component.`,
              componentId: stuC.id
            }]
          };
        }
      }
    }
  }

  return { exactMatched, polarityMatched, polarityMismatch, connectionMismatch };
}
