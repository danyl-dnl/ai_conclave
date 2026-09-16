import { useState, useMemo } from 'react';
import './App.css';
import { goldenCircuit } from './shared/demoCircuit';
import type { Circuit } from './shared/types';
import { TeacherEditor, CircuitReview } from './teacher';
import StudentActivity from './student/StudentActivity';
import { simulateCircuit } from './simulation';
import { verifyCircuit } from './verification/verifyCircuit';
import { EvidenceDashboard } from './evidence/EvidenceDashboard';
import {
  makeSimulateAdapter,
  makeVerifyAdapter,
  makeOnLearningEventAdapter,
} from './integration/adapters';

// ── Stable session ID for this page load ────────────────────────────────────
let SESSION_ID = sessionStorage.getItem('SESSION_ID');
if (!SESSION_ID) {
  SESSION_ID = `session-${Date.now()}`;
  sessionStorage.setItem('SESSION_ID', SESSION_ID);
}
const ACTIVE_SESSION_ID = SESSION_ID as string;

// ── Application view ─────────────────────────────────────────────────────────
type AppView = 'teacher' | 'student' | 'evidence';

function App() {
  const [view, setView] = useState<AppView>('teacher');
  const [workingCircuit, setWorkingCircuit] = useState<Circuit>(goldenCircuit);
  // approvedCircuit is the immutable reference passed to students.
  const [approvedCircuit, setApprovedCircuit] = useState<Circuit | null>(null);

  // ── Build stable adapted props for StudentActivity ────────────────────────
  // Memoised so the same function references are passed on every render
  // (prevents unnecessary re-mounts of the student workspace).
  const simulateAdapter = useMemo(() => makeSimulateAdapter(simulateCircuit), []);
  const verifyAdapter   = useMemo(() => makeVerifyAdapter(verifyCircuit), []);
  const onLearningEvent = useMemo(() => makeOnLearningEventAdapter(ACTIVE_SESSION_ID), []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleApprove(circuit: Circuit) {
    // Freeze a deep copy so student edits never reach the teacher reference.
    setApprovedCircuit(JSON.parse(JSON.stringify(circuit)));
    setView('student');
  }

  function handleReturnToTeacher() {
    setApprovedCircuit(null);
    setWorkingCircuit(goldenCircuit);
    setView('teacher');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-root">
      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <header className="app-header">
        <h1 className="app-title">AccessGraph</h1>
        <nav aria-label="Application navigation">
          <ul className="app-nav">
            <li>
              <button
                type="button"
                className={`app-nav-btn${view === 'teacher' ? ' app-nav-btn--active' : ''}`}
                onClick={() => setView('teacher')}
                aria-current={view === 'teacher' ? 'page' : undefined}
              >
                Teacher
              </button>
            </li>
            {approvedCircuit && (
              <li>
                <button
                  type="button"
                  className={`app-nav-btn${view === 'student' ? ' app-nav-btn--active' : ''}`}
                  onClick={() => setView('student')}
                  aria-current={view === 'student' ? 'page' : undefined}
                >
                  Student Activity
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                className={`app-nav-btn${view === 'evidence' ? ' app-nav-btn--active' : ''}`}
                onClick={() => setView('evidence')}
                aria-current={view === 'evidence' ? 'page' : undefined}
              >
                Evidence
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="app-main">

        {/* ── Teacher Workspace ─────────────────────────────────────────── */}
        {view === 'teacher' && (
          <section aria-labelledby="teacher-heading">
            <h2 id="teacher-heading">Teacher Workspace</h2>
            {approvedCircuit ? (
              <div className="app-approved-banner" role="status">
                <p>
                  <strong>Circuit approved and sent to students.</strong>{' '}
                  The student activity is now active.
                </p>
                <button
                  type="button"
                  onClick={handleReturnToTeacher}
                  className="app-btn app-btn--secondary"
                >
                  Reset &amp; Edit New Circuit
                </button>
              </div>
            ) : (
              <>
                <TeacherEditor
                  circuit={workingCircuit}
                  onChange={setWorkingCircuit}
                />
                <CircuitReview
                  circuit={workingCircuit}
                  onApprove={handleApprove}
                />
              </>
            )}
          </section>
        )}

        {/* ── Student Activity ──────────────────────────────────────────── */}
        {view === 'student' && approvedCircuit && (
          <StudentActivity
            circuit={approvedCircuit}
            simulateCircuit={simulateAdapter}
            verifyCircuit={verifyAdapter}
            onLearningEvent={onLearningEvent}
          />
        )}

        {/* ── No circuit approved yet placeholder ──────────────────────── */}
        {view === 'student' && !approvedCircuit && (
          <section aria-labelledby="no-circuit-heading">
            <h2 id="no-circuit-heading">No Circuit Approved Yet</h2>
            <p>
              The teacher must review and approve a circuit before the student
              activity becomes available.
            </p>
            <button
              type="button"
              className="app-btn app-btn--primary"
              onClick={() => setView('teacher')}
            >
              Go to Teacher Workspace
            </button>
          </section>
        )}

        {/* ── Evidence Dashboard ────────────────────────────────────────── */}
        {view === 'evidence' && (
          <section aria-labelledby="evidence-section-heading">
            <h2 id="evidence-section-heading">Learning Evidence</h2>
            <EvidenceDashboard sessionId={ACTIVE_SESSION_ID} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
