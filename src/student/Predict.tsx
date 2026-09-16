import { useState, useRef, useEffect } from 'react';
import type { Circuit } from '../shared/types';
import { circuitOverview } from './circuitDescription';

interface PredictProps {
  circuit: Circuit;
  /**
   * null = no prediction saved yet.
   * string = prediction saved (immutable — not overwritten after experiment).
   */
  savedPrediction: string | null;
  onSavePrediction: (text: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Prediction capture screen.
 *
 * The learner writes their prediction before any circuit modification.
 * Once saved, the prediction is displayed read-only and cannot be changed.
 * "Continue" is only available after saving.
 */
export default function Predict({
  circuit,
  savedPrediction,
  onSavePrediction,
  onContinue,
  onBack,
}: PredictProps) {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleSave() {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setError('Please write your prediction before saving.');
      return;
    }
    setError('');
    onSavePrediction(trimmed);
  }

  const overview = circuitOverview(circuit);

  return (
    <section className="student-step" aria-labelledby="predict-heading">
      <h2
        id="predict-heading"
        ref={headingRef}
        tabIndex={-1}
        className="student-step-heading"
      >
        Record Your Prediction
      </h2>

      {/* Circuit context — generated from model, not hard-coded */}
      <div className="student-context-box" aria-label="Circuit context">
        <p>
          <strong>Circuit:</strong> {overview}
        </p>
        <p>
          In the next step you will disconnect a component terminal from its node.
        </p>
      </div>

      <p className="student-predict-prompt">
        Before making any changes, describe what you predict will happen to the circuit
        currents when a component branch is disconnected.
      </p>

      {savedPrediction === null ? (
        /* ── Input form ─────────────────────────────────────────── */
        <div className="student-form-group">
          <label htmlFor="prediction-input" className="student-label">
            Your prediction
          </label>
          <textarea
            id="prediction-input"
            className="student-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
            placeholder="Describe what you think will happen…"
            aria-required="true"
            aria-describedby={error ? 'prediction-error' : undefined}
          />

          {error && (
            <p id="prediction-error" role="alert" className="student-error">
              {error}
            </p>
          )}

          <div className="student-actions">
            <button
              type="button"
              id="predict-back-btn"
              className="student-btn student-btn--ghost"
              onClick={onBack}
            >
              Back to Explore
            </button>
            <button
              type="button"
              id="predict-save-btn"
              className="student-btn student-btn--primary"
              onClick={handleSave}
            >
              Save Prediction
            </button>
          </div>
        </div>
      ) : (
        /* ── Saved prediction (read-only) ────────────────────────── */
        <div>
          <div className="student-saved-prediction" aria-label="Your saved prediction">
            <p>
              <strong>Your prediction (saved):</strong>
            </p>
            <blockquote className="student-prediction-text">{savedPrediction}</blockquote>
            <p className="student-note">
              This prediction has been recorded and will not change during the experiment.
            </p>
          </div>

          <div className="student-actions">
            <button
              type="button"
              id="predict-back-btn"
              className="student-btn student-btn--ghost"
              onClick={onBack}
            >
              Back to Explore
            </button>
            <button
              type="button"
              id="predict-continue-btn"
              className="student-btn student-btn--primary"
              onClick={onContinue}
            >
              Continue to Experiment
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
