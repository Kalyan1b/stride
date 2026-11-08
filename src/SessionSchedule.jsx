import React, { useState } from 'react';
import { scheduledDate, completedThisWeek } from './appState';
import { localDate } from './workoutPlan';
export default function SessionSchedule({ state, plan, onMove, onResume, onSelect }) {
  const [error, setError] = useState('');
  return (
    <details className="schedule-editor">
      <summary>Move sessions & resume after a break</summary>
      <p className="form-hint">
        Missed a day? Keep your exercise order and unfinished sets. “Resume from today” spaces
        remaining sessions two days apart; you can also choose individual dates.
      </p>
      <button
        className="outline"
        onClick={() => {
          onResume();
          setError('');
        }}
      >
        Resume from today
      </button>
      <div className="schedule-list">
        {plan.map((workout) => {
          const date = scheduledDate(state, workout.id),
            complete = completedThisWeek(state, workout.id);
          return (
            <div key={workout.id}>
              <button className="text-button" onClick={() => onSelect(workout.id)}>
                {workout.title}
              </button>
              <small>
                {complete
                  ? 'Completed this week'
                  : date < localDate()
                    ? 'Overdue · resume when ready'
                    : 'Planned'}
              </small>
              <label>
                Session date
                <input
                  aria-label={`Date for ${workout.title}`}
                  type="date"
                  value={date}
                  onChange={(event) => {
                    const ok = onMove(workout.id, event.target.value);
                    setError(ok ? '' : 'Choose a valid date without another planned session.');
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="form-hint">
        Allow recovery between hard sessions for the same muscles. After a long break, start at an
        easier difficulty and rebuild gradually.
      </p>
    </details>
  );
}
