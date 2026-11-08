import React, { useState } from 'react';
import { performanceSummary } from './training';
export default function PerformanceHistory({ history }) {
  const names = [
    ...new Set(
      history.flatMap((record) =>
        (record.performance || []).filter((entry) => entry.sets.length).map((entry) => entry.name),
      ),
    ),
  ].sort();
  const [selected, setSelected] = useState('');
  const name = names.includes(selected) ? selected : names[0];
  const records = history
    .flatMap((record) =>
      (record.performance || [])
        .filter((entry) => entry.name === name && entry.sets.length)
        .map((entry) => ({ ...entry, id: record.id, date: record.date })),
    )
    .reverse();
  const first = records.at(-1),
    last = records[0];
  const comparable =
    first &&
    last &&
    first !== last &&
    first.unit === last.unit &&
    first.perSide === last.perSide &&
    first.sets.length === last.sets.length &&
    first.sets.every(
      (row, i) =>
        row.weight === last.sets[i].weight && (first.unit !== 'reps' || row.weight !== ''),
    );
  const delta = comparable
    ? last.sets.reduce((sum, row) => sum + Number(row.value), 0) -
      first.sets.reduce((sum, row) => sum + Number(row.value), 0)
    : null;
  return (
    <section className="activity-card performance-history">
      <div className="section-title">
        <div>
          <span className="eyebrow">MORE THAN A CHECKMARK</span>
          <h2>Your exercise performance</h2>
        </div>
      </div>
      {names.length ? (
        <>
          <label>
            Exercise
            <select
              aria-label="Performance exercise"
              value={name}
              onChange={(event) => setSelected(event.target.value)}
            >
              {names.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          {delta !== null && (
            <p>
              {delta > 0 ? `+${delta}` : delta} {last.unit} across the same number of sets at the
              same recorded load, compared with your first log{last.perSide ? ' (per side)' : ''}.
            </p>
          )}
          <div className="performance-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Actual sets</th>
                  <th>Effort</th>
                </tr>
              </thead>
              <tbody>
                {records.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{performanceSummary(entry)}</td>
                    <td>
                      {entry.effort === 'right' ? 'About right' : entry.effort || 'Not recorded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="form-hint">
            Compare the same movement and loading convention. Blank loads are unrecorded, so they
            aren’t treated as proof of strength gains.
          </p>
        </>
      ) : (
        <p>
          Log sets during a workout to see reps, time, load, and effort here. Older completion-only
          sessions remain in Recent activity.
        </p>
      )}
    </section>
  );
}
