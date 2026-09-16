import { describe, it, expect, vi } from 'vitest';
import { makeVerifyAdapter } from './adapters';
import type { Circuit } from '../shared/types';
import type { StructuralMismatch } from '../verification/verifyCircuit';

describe('adapters', () => {
  describe('makeVerifyAdapter', () => {
    it('exhaustively maps all mismatch types correctly', () => {
      const mockVerify = vi.fn();
      const adapter = makeVerifyAdapter(mockVerify as any);
      
      const mismatchTypes: StructuralMismatch['type'][] = [
        'MISSING_COMPONENT',
        'EXTRA_COMPONENT',
        'VALUE_MISMATCH',
        'POLARITY_MISMATCH',
        'CONNECTION_MISMATCH',
        'TOPOLOGY_MISMATCH',
        'DISCONNECTED_TERMINAL',
        'MALFORMED_CIRCUIT'
      ];
      
      const expectedMappings = {
        'MISSING_COMPONENT': 'component-count',
        'EXTRA_COMPONENT': 'component-count',
        'VALUE_MISMATCH': 'component-value',
        'POLARITY_MISMATCH': 'polarity',
        'CONNECTION_MISMATCH': 'connectivity',
        'TOPOLOGY_MISMATCH': 'connectivity',
        'DISCONNECTED_TERMINAL': 'connectivity',
        'MALFORMED_CIRCUIT': 'connectivity'
      } as const;

      const emptyCircuit = { components: [] } as any as Circuit;
      
      for (const type of mismatchTypes) {
        mockVerify.mockReturnValueOnce({
          equivalent: false,
          mismatches: [{ type, message: 'Test message' }]
        });
        
        const result = adapter(emptyCircuit, emptyCircuit);
        expect(result.equivalent).toBe(false);
        expect(result.mismatches[0].type).toBe(expectedMappings[type]);
      }
    });

    it('throws an error for unsupported mismatch types', () => {
      const mockVerify = vi.fn();
      const adapter = makeVerifyAdapter(mockVerify as any);
      const emptyCircuit = { components: [] } as any as Circuit;
      
      mockVerify.mockReturnValueOnce({
        equivalent: false,
        mismatches: [{ type: 'SOME_UNKNOWN_TYPE' as any, message: 'Bad' }]
      });
      
      expect(() => adapter(emptyCircuit, emptyCircuit)).toThrow('Unsupported mismatch type: SOME_UNKNOWN_TYPE');
    });
  });
});
