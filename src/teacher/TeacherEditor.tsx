import React from 'react';
import type { Circuit } from '../shared/types';

export interface TeacherEditorProps {
  circuit: Circuit;
  onChange: (updatedCircuit: Circuit) => void;
}

export const TeacherEditor: React.FC<TeacherEditorProps> = ({ circuit, onChange }) => {
  
  const handleValueChange = (compId: string, newValue: number) => {
    const updatedComponents = circuit.components.map(c => 
      c.id === compId ? { ...c, value: newValue } : c
    );
    onChange({ ...circuit, components: updatedComponents });
  };

  const handleNodeChange = (compId: string, terminalIndex: number, newNodeId: string | null) => {
    const updatedComponents = circuit.components.map(c => {
      if (c.id === compId) {
        const newTerminals = [...c.terminals] as [any, any];
        newTerminals[terminalIndex] = { ...newTerminals[terminalIndex], nodeId: newNodeId };
        return { ...c, terminals: newTerminals };
      }
      return c;
    });
    onChange({ ...circuit, components: updatedComponents });
  };

  return (
    <div className="teacher-editor" style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}>
      <h2>Edit Circuit: {circuit.name}</h2>
      
      <fieldset style={{ marginTop: '1rem', border: '1px solid #eee', padding: '1rem' }}>
        <legend>Components</legend>
        
        {circuit.components.map(comp => (
          <div key={comp.id} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{comp.id} ({comp.type})</h3>
            
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'inline-block', width: '120px' }} htmlFor={`value-${comp.id}`}>
                Value ({comp.type === 'voltage_source' ? 'V' : 'ohm'}):
              </label>
              <input
                id={`value-${comp.id}`}
                type="number"
                value={comp.value}
                onChange={(e) => handleValueChange(comp.id, parseFloat(e.target.value))}
                style={{ padding: '0.25rem' }}
              />
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'inline-block', width: '120px' }} htmlFor={`node0-${comp.id}`}>
                {comp.type === 'voltage_source' ? 'Pos' : 'Term A'} ({comp.terminals[0].id}):
              </label>
              <select 
                id={`node0-${comp.id}`}
                value={comp.terminals[0].nodeId || ''}
                onChange={(e) => handleNodeChange(comp.id, 0, e.target.value || null)}
                style={{ padding: '0.25rem' }}
              >
                <option value="">Disconnected</option>
                {circuit.nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'inline-block', width: '120px' }} htmlFor={`node1-${comp.id}`}>
                {comp.type === 'voltage_source' ? 'Neg' : 'Term B'} ({comp.terminals[1].id}):
              </label>
              <select 
                id={`node1-${comp.id}`}
                value={comp.terminals[1].nodeId || ''}
                onChange={(e) => handleNodeChange(comp.id, 1, e.target.value || null)}
                style={{ padding: '0.25rem' }}
              >
                <option value="">Disconnected</option>
                {circuit.nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}
              </select>
            </div>
            
          </div>
        ))}
      </fieldset>
    </div>
  );
};
