import React from 'react';
import { weekdays } from './workoutPlan';
import { limitationLabels, movement } from './training';
export default function RoutinePreferences({ draft, update }) {
  const selected = draft.preferredDays || [];
  return (
    <>
      <label>
        Time available per session
        <select
          value={draft.sessionMinutes || 45}
          onChange={(event) => update('sessionMinutes', Number(event.target.value))}
        >
          {[20, 30, 45, 60].map((minutes) => (
            <option key={minutes} value={minutes}>
              Up to {minutes} minutes
            </option>
          ))}
        </select>
      </label>
      <fieldset className="preference-field">
        <legend>Preferred training days (optional)</legend>
        <p className="form-hint">
          Choose exactly {draft.days} days, or leave all unchecked for a suggested schedule.
        </p>
        <div className="weekday-options">
          {weekdays.map((day, index) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={selected.includes(index)}
                onChange={() =>
                  update(
                    'preferredDays',
                    selected.includes(index)
                      ? selected.filter((value) => value !== index)
                      : [...selected, index].sort((a, b) => a - b),
                  )
                }
              />
              {day.slice(0, 3)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="preference-field">
        <legend>Any movements you want to avoid?</legend>
        <p className="form-hint">
          We’ll exclude these movement types. This is a preference filter, not an assessment of an
          injury.
        </p>
        {Object.entries(limitationLabels).map(([tag, label]) => (
          <label key={tag}>
            <input
              type="checkbox"
              checked={draft.limitations?.includes(tag) || false}
              onChange={() =>
                update(
                  'limitations',
                  draft.limitations?.includes(tag)
                    ? draft.limitations.filter((value) => value !== tag)
                    : [...(draft.limitations || []), tag],
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <details className="exercise-exclusions">
        <summary>Exclude specific exercises</summary>
        <p className="form-hint">
          Choose movements you don’t want in your program. Fewer choices may reduce coverage; review
          your plan before starting.
        </p>
        <div className="exclusion-list">
          {Object.keys(movement).map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={draft.excludedExercises?.includes(name) || false}
                onChange={() =>
                  update(
                    'excludedExercises',
                    draft.excludedExercises?.includes(name)
                      ? draft.excludedExercises.filter((value) => value !== name)
                      : [...(draft.excludedExercises || []), name],
                  )
                }
              />
              {name}
            </label>
          ))}
        </div>
      </details>
    </>
  );
}
