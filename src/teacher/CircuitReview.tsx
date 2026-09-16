import React, { useState } from 'react';
import type { Circuit, ValidationResult } from '../shared/types';
import { validateCircuit } from '../core/validation/circuitValidation';

export interface CircuitReviewProps {
  circuit: Circuit;
  onApprove: (approvedCircuit: Circuit) => void;
}

export const CircuitReview: React.FC<CircuitReviewProps> = ({ circuit, onApprove }) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>(() => validateCircuit(circuit));

  // Re-validate when circuit prop changes (if it changes externally)
  React.useEffect(() => {
    setValidationResult(validateCircuit(circuit));
  }, [circuit]);

  const handleApprove = () => {
    if (validationResult.valid) {
      onApprove(circuit);
    }
  };

  return (
    <div className="circuit-review" style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}>
      <h2>Circuit Review: {circuit.name}</h2>
      
      <div className="circuit-summary">
        <p><strong>Components:</strong> {circuit.components.length}</p>
        <p><strong>Nodes:</strong> {circuit.nodes.length}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Component</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Type</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Value</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Terminal 1</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ddd' }}>Terminal 2</th>
          </tr>
        </thead>
        <tbody>
          {circuit.components.map((comp) => (
            <tr key={comp.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{comp.id}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{comp.type === 'voltage_source' ? 'Voltage Source' : 'Resistor'}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                {comp.value} {comp.type === 'voltage_source' ? 'V' : 'ohm'}
              </td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                {comp.terminals[0]?.nodeId || 'Disconnected'} ({comp.terminals[0]?.id})
              </td>
              <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                {comp.terminals[1]?.nodeId || 'Disconnected'} ({comp.terminals[1]?.id})
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: validationResult.valid ? '#e8f5e9' : '#ffebee' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Validation Status: {validationResult.valid ? 'Valid' : 'Invalid'}</h3>
        {!validationResult.valid && (
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {validationResult.errors.map((err, i) => (
              <li key={i}>
                <strong>{err.code}</strong>: {err.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <button 
          onClick={handleApprove}
          disabled={!validationResult.valid}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: validationResult.valid ? '#2196f3' : '#ccc',
            color: 'white',
            border: 'none',
            cursor: validationResult.valid ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          Approve Circuit
        </button>
      </div>
    </div>
  );
};
