import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordLearningEvent,
  getLearningEvents,
  getInitialPrediction,
  clearLearningEvents,
  STORAGE_KEY
} from './eventStore';

const mockStorage: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  }),
  length: 0,
  key: vi.fn((_index: number) => null),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('eventStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should start with an empty event list', () => {
    expect(getLearningEvents('session-1')).toEqual([]);
  });

  it('should record and retrieve a learning event', () => {
    const event = recordLearningEvent('session-1', 'prediction', { predictionText: 'it will turn off' });
    expect(event.id).toBeDefined();
    expect(event.sessionId).toBe('session-1');
    expect(event.type).toBe('prediction');
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.payload).toEqual({ predictionText: 'it will turn off' });

    const events = getLearningEvents('session-1');
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(event.id);
  });

  it('should filter events by session ID', () => {
    recordLearningEvent('session-1', 'edit', {});
    recordLearningEvent('session-2', 'edit', {});

    const session1Events = getLearningEvents('session-1');
    expect(session1Events.length).toBe(1);
    expect(session1Events[0].sessionId).toBe('session-1');
  });

  it('should retrieve the initial prediction immutably', () => {
    recordLearningEvent('session-1', 'prediction', { predictionText: 'first' });
    recordLearningEvent('session-1', 'edit', {});
    recordLearningEvent('session-1', 'prediction', { predictionText: 'second' });

    const initial = getInitialPrediction('session-1');
    expect(initial?.payload.predictionText).toBe('first');
  });

  it('should recover gracefully from corrupted localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json {[');
    expect(getLearningEvents()).toEqual([]);

    recordLearningEvent('session-1', 'edit', {});
    expect(getLearningEvents().length).toBe(1);
  });

  it('should clear events correctly', () => {
    recordLearningEvent('session-1', 'edit', {});
    recordLearningEvent('session-2', 'edit', {});

    clearLearningEvents('session-1');
    expect(getLearningEvents('session-1')).toEqual([]);
    expect(getLearningEvents('session-2').length).toBe(1);

    clearLearningEvents();
    expect(getLearningEvents()).toEqual([]);
  });
});
