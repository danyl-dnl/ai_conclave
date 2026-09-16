import { useState } from 'react';
import './App.css';
import { goldenCircuit } from './shared/demoCircuit';
import type { Circuit } from './shared/types';
import { TeacherEditor, CircuitReview } from './teacher';

function App() {
  const [workingCircuit, setWorkingCircuit] = useState<Circuit>(goldenCircuit);
  const [approvedCircuit, setApprovedCircuit] = useState<Circuit | null>(null);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>AccessGraph - Teacher Workspace</h1>
      
      {!approvedCircuit ? (
        <>
          <TeacherEditor 
            circuit={workingCircuit} 
            onChange={setWorkingCircuit} 
          />
          <CircuitReview 
            circuit={workingCircuit} 
            onApprove={(circuit) => {
              setApprovedCircuit(circuit);
              alert('Circuit Approved!');
            }} 
          />
        </>
      ) : (
        <div style={{ padding: '2rem', backgroundColor: '#e8f5e9', border: '1px solid #4caf50' }}>
          <h2>Circuit Approved!</h2>
          <p>The approved canonical circuit is ready for student use.</p>
          <pre style={{ backgroundColor: '#fff', padding: '1rem', overflowX: 'auto' }}>
            {JSON.stringify(approvedCircuit, null, 2)}
          </pre>
          <button onClick={() => setApprovedCircuit(null)}>Edit Again</button>
        </div>
      )}
    </div>
  );
}

export default App;
