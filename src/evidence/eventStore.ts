import type { StructuralMismatch } from '../verification/verifyCircuit';

export type LearningEventType =
  | 'prediction'
  | 'edit'
  | 'simulation'
  | 'reconstruction'
  | 'verification';

export interface LearningEvent<T = unknown> {
  id: string;
  sessionId: string;
  type: LearningEventType;
  timestamp: number;
  payload: T;
}

export interface PredictionPayload {
  predictionText: string;
}

export interface VerificationPayload {
  equivalent: boolean;
  mismatches: StructuralMismatch[];
}

export const STORAGE_KEY = 'accessgraph_learning_events';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function getLearningEvents(sessionId?: string): LearningEvent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    
    let events = parsed as LearningEvent[];
    if (sessionId) {
      events = events.filter(e => e.sessionId === sessionId);
    }
    return events;
  } catch (e) {
    console.error('Failed to parse learning events from localStorage. Recovering with empty state.', e);
    return [];
  }
}

export function recordLearningEvent<T>(
  sessionId: string,
  type: LearningEventType,
  payload: T
): LearningEvent<T> {
  const events = getLearningEvents();
  
  const newEvent: LearningEvent<T> = {
    id: generateId(),
    sessionId,
    type,
    timestamp: Date.now(),
    payload
  };

  events.push(newEvent as LearningEvent<unknown>);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save learning event to localStorage', e);
  }
  
  return newEvent;
}

export function getInitialPrediction(sessionId: string): LearningEvent<PredictionPayload> | null {
  const events = getLearningEvents(sessionId);
  const predictionEvent = events.find(e => e.type === 'prediction');
  if (predictionEvent) {
    return predictionEvent as LearningEvent<PredictionPayload>;
  }
  return null;
}

export function clearLearningEvents(sessionId?: string): void {
  try {
    if (sessionId) {
      const allEvents = getLearningEvents();
      const filtered = allEvents.filter(e => e.sessionId !== sessionId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to clear learning events', e);
  }
}
