import React, { useState, useEffect } from 'react';
import { getLearningEvents } from './eventStore';
import type { LearningEvent } from './eventStore';

interface EvidenceDashboardProps {
  sessionId?: string;
}

export const EvidenceDashboard: React.FC<EvidenceDashboardProps> = ({ sessionId }) => {
  const [events, setEvents] = useState<LearningEvent[]>([]);

  useEffect(() => {
    // Load events on mount
    setEvents(getLearningEvents(sessionId));
    
    // In a real app we might listen for updates via context or events,
    // but for the MVP, reading on mount/refresh is sufficient.
    const handleStorageChange = () => {
      setEvents(getLearningEvents(sessionId));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionId]);

  if (events.length === 0) {
    return (
      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading">Learning Evidence Timeline</h2>
        <p>No learning evidence recorded for this session yet.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="evidence-heading">
      <h2 id="evidence-heading">Learning Evidence Timeline</h2>
      <ol style={{ listStyleType: 'none', paddingLeft: 0 }}>
        {events.map((event) => {
          let description = 'Unknown event';
          let details = null;

          switch (event.type) {
            case 'prediction': {
              const payload = event.payload as { predictionText: string };
              description = `Prediction recorded: "${payload.predictionText}"`;
              break;
            }
            case 'edit': {
              description = `Circuit modified`;
              break;
            }
            case 'simulation': {
              description = `Simulation ran`;
              break;
            }
            case 'reconstruction': {
              description = `Reconstruction attempt made`;
              break;
            }
            case 'verification': {
              const payload = event.payload as { equivalent: boolean, mismatches: any[] };
              if (payload.equivalent) {
                description = `Verification passed! Structural match confirmed.`;
              } else {
                description = `Verification failed.`;
                if (payload.mismatches && payload.mismatches.length > 0) {
                  details = (
                    <ul>
                      {payload.mismatches.map((m, i) => (
                        <li key={i}>{m.message}</li>
                      ))}
                    </ul>
                  );
                }
              }
              break;
            }
          }

          return (
            <li key={event.id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
              <div style={{ fontWeight: 'bold' }}>{new Date(event.timestamp).toLocaleTimeString()} - {event.type.toUpperCase()}</div>
              <div>{description}</div>
              {details && <div style={{ marginTop: '0.5rem' }}>{details}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
