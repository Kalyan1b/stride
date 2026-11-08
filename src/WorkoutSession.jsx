import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Leaf, Pause, Play, Timer, X } from 'lucide-react';
import ExercisePreview from './ExercisePreview';
import { restMilliseconds, startRest, pauseRest, resumeRest } from './appState';
import {
  emptySet,
  latestPerformance,
  normalizeLog,
  performanceSummary,
  progression,
  validSet,
} from './training';
import { alternatives } from './workoutPlan';

export default function WorkoutSession({
  workout,
  profile,
  history,
  draft,
  onUpdate,
  onSwap,
  onGuide,
  onFinish,
  onClose,
}) {
  const { index, started, done, rest } = draft;
  const [now, setNow] = useState(Date.now);
  const ref = useRef(null),
    heading = useRef(null);
  const exercise = workout.exercises[index];
  const log = normalizeLog(draft.logs?.[exercise?.name], exercise || { sets: 0 });
  const previous = exercise && latestPerformance(history, exercise.name);
  const remaining = Math.ceil(restMilliseconds(rest, now) / 1000);
  const allDone = workout.exercises.every(
    (item, i) => done.includes(i) || draft.skipped?.[item.name],
  );
  const isSkipped = Boolean(draft.skipped?.[exercise?.name]);
  const restSeconds = draft.restSeconds || exercise?.restSeconds || 90;
  const swaps = exercise
    ? alternatives(exercise, profile).filter(
        (item) => !workout.exercises.some((current) => current.name === item.name),
      )
    : [];
  useEffect(() => {
    ref.current.showModal();
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [index, started]);
  useEffect(() => {
    if (!rest || rest.paused || restMilliseconds(rest) === 0) return;
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = setInterval(refresh, 250);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [rest]);
  function update(patch) {
    setNow(Date.now());
    onUpdate(patch);
  }
  function saveLog(next, patch = {}) {
    update({ logs: { ...draft.logs, [exercise.name]: next }, ...patch });
  }
  function editSet(i, field, value) {
    saveLog({
      ...log,
      sets: log.sets.map((row, j) => (i === j ? { ...row, [field]: value, done: false } : row)),
    });
  }
  function completeSet(i) {
    const row = log.sets[i];
    if (!validSet(row, exercise)) return;
    saveLog(
      { ...log, sets: log.sets.map((entry, j) => (i === j ? { ...entry, done: true } : entry)) },
      { rest: startRest(Date.now(), restSeconds) },
    );
  }
  function nextExercise() {
    const next = workout.exercises.findIndex(
      (item, i) => i > index && !done.includes(i) && !draft.skipped?.[item.name],
    );
    update({ index: next >= 0 ? next : (index + 1) % workout.exercises.length, rest: null });
  }
  return (
    <dialog
      ref={ref}
      className="session-dialog"
      aria-labelledby="session-heading"
      onCancel={onClose}
    >
      <div className="dialog-padding">
        <button className="close" onClick={onClose} aria-label="Close workout">
          <X size={22} />
        </button>
        <span className="eyebrow">YOUR WORKOUT / {workout.title.toUpperCase()}</span>
        {!started ? (
          <>
            <h2 ref={heading} tabIndex={-1} id="session-heading">
              Get ready for today.
            </h2>
            <p className="dialog-intro">
              Allow about 5 minutes to warm up. Today’s estimate includes your sets, rest, and
              warm-up.
            </p>
            <div className="warmup-list">
              <span>
                <Check size={17} /> Walk or march gently for 2 minutes
              </span>
              <span>
                <Check size={17} /> Move the joints you’ll use through a comfortable range
              </span>
              <span>
                <Check size={17} /> Rehearse {exercise?.name.toLowerCase()} at an easy difficulty
              </span>
            </div>
            <div className="session-tip">
              <Leaf size={18} />
              <p>
                Leave about 2 controlled reps in reserve. Stop a movement if it hurts. You can swap
                an unsuitable exercise or skip it without marking it complete.
              </p>
            </div>
            <button className="primary wide" onClick={() => update({ started: true })}>
              I’m warmed up. Let’s go <ArrowRight size={18} />
            </button>
          </>
        ) : exercise ? (
          <>
            <div className="session-heading-row">
              <div>
                <span className="subtle-label">
                  EXERCISE {index + 1} OF {workout.exercises.length}
                </span>
                <h2 id="session-heading" tabIndex={-1} ref={heading}>
                  {exercise.name}
                </h2>
              </div>
              <span className="completion-count">
                {done.length}/{workout.exercises.length}
                <small>completed</small>
              </span>
            </div>
            <div className="session-stepper" aria-label="Exercise progress">
              {workout.exercises.map((item, i) => (
                <button
                  key={item.name}
                  className={`${i === index ? 'current ' : ''}${done.includes(i) ? 'done' : ''}`}
                  onClick={() => update({ index: i, rest: null })}
                  aria-label={`Exercise ${i + 1}: ${item.name}${done.includes(i) ? ', complete' : draft.skipped?.[item.name] ? ', skipped' : ''}`}
                  aria-current={i === index ? 'step' : undefined}
                >
                  {done.includes(i) ? <Check size={14} /> : i + 1}
                </button>
              ))}
            </div>
            <ExercisePreview
              key={exercise.name}
              name={exercise.name}
              large
              onClick={() => onGuide(exercise.name)}
            />
            <div className="prescription">
              <span className="prescription-mark">↗</span>
              <div>
                <strong>{exercise.prescription}</strong>
                <span>
                  {exercise.focus}
                  {exercise.perSide ? ' · Record reps for each side' : ''}
                </span>
              </div>
            </div>
            <div className="training-advice" role="note">
              <b>{previous ? `Last time · ${previous.date}` : 'Your starting point'}</b>
              {previous && (
                <p>
                  {performanceSummary(previous)}
                  {previous.effort
                    ? ` · ${previous.effort === 'right' ? 'about right' : previous.effort}`
                    : ''}
                </p>
              )}
              <p>{progression(exercise, previous)}</p>
            </div>
            <div className="session-tools">
              <label>
                Swap exercise
                <select
                  aria-label="Swap exercise"
                  value=""
                  disabled={log.sets.some((row) => row.done)}
                  onChange={(event) => {
                    if (event.target.value) onSwap(index, event.target.value);
                  }}
                >
                  <option value="">
                    {swaps.length ? 'Choose an alternative' : 'No matching alternatives'}
                  </option>
                  {swaps.map((item) => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Rest between sets
                <select
                  aria-label="Rest between sets"
                  value={restSeconds}
                  onChange={(event) => update({ restSeconds: Number(event.target.value) })}
                >
                  {[30, 60, 90, 120, 180, 300].map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds} seconds
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {log.sets.some((row) => row.done) && (
              <p className="form-hint">
                Undo logged sets before changing this exercise. Different movements keep separate
                performance records.
              </p>
            )}
            {isSkipped ? (
              <div className="training-advice">
                <p>
                  Skipped: {draft.skipped[exercise.name]}. This won’t count as a completed exercise.
                </p>
                <button
                  className="outline"
                  onClick={() => {
                    const skipped = { ...draft.skipped };
                    delete skipped[exercise.name];
                    update({ skipped });
                  }}
                >
                  Return to this exercise
                </button>
              </div>
            ) : (
              <>
                <div className="set-log" aria-label="Set tracking">
                  <div className="set-labels">
                    <span>Set</span>
                    <span>
                      {exercise.unit === 'reps'
                        ? `Reps${exercise.perSide ? '/side' : ''}`
                        : exercise.unit === 'sec'
                          ? 'Seconds'
                          : 'Minutes'}
                    </span>
                    <span>Load (kg)</span>
                    <span>Status</span>
                  </div>
                  {log.sets.map((row, i) => (
                    <div className={`set-row ${row.done ? 'logged' : ''}`} key={i}>
                      <b>{i + 1}</b>
                      <input
                        aria-label={`Set ${i + 1} ${exercise.unit}`}
                        type="number"
                        inputMode={exercise.unit === 'reps' ? 'numeric' : 'decimal'}
                        min="1"
                        max={exercise.unit === 'reps' ? 200 : exercise.unit === 'sec' ? 3600 : 120}
                        step={exercise.unit === 'reps' ? '1' : 'any'}
                        placeholder={`${exercise.min}–${exercise.max}`}
                        value={row.value}
                        disabled={row.done}
                        onChange={(event) => editSet(i, 'value', event.target.value)}
                      />
                      <input
                        aria-label={`Set ${i + 1} weight in kilograms`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="500"
                        step="any"
                        placeholder="Optional"
                        value={row.weight}
                        disabled={row.done || exercise.unit !== 'reps'}
                        onChange={(event) => editSet(i, 'weight', event.target.value)}
                      />
                      <button
                        className={row.done ? 'outline' : 'primary'}
                        aria-label={`${row.done ? 'Undo' : 'Log'} set ${i + 1}`}
                        disabled={
                          !row.done &&
                          (!validSet(row, exercise) ||
                            log.sets.slice(0, i).some((before) => !before.done))
                        }
                        onClick={() =>
                          row.done
                            ? saveLog(
                                {
                                  ...log,
                                  effort: '',
                                  sets: log.sets.map((entry, j) =>
                                    j === i ? { ...entry, done: false } : entry,
                                  ),
                                },
                                { rest: null },
                              )
                            : completeSet(i)
                        }
                      >
                        {row.done ? 'Undo' : 'Log set'}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="form-hint">
                  Load is optional. For dumbbells, record the weight of one dumbbell consistently.
                  Enter 0 for bodyweight, or leave load blank.
                </p>
                <fieldset className="effort-field">
                  <legend>How did this exercise feel?</legend>
                  {[
                    ['easy', 'Too easy'],
                    ['right', 'About right'],
                    ['hard', 'Too hard'],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={log.effort === value}
                      onClick={() => saveLog({ ...log, effort: value })}
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
            {remaining > 0 ? (
              <div
                className="rest-timer"
                role="timer"
                aria-label={`${remaining} seconds of rest remaining`}
              >
                <Timer size={20} />
                <div>
                  <b>Rest between sets</b>
                  <span>{rest.paused ? 'Timer paused' : 'Continue when you feel ready'}</span>
                </div>
                <strong>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </strong>
                <button
                  aria-label={rest.paused ? 'Resume rest timer' : 'Pause rest timer'}
                  onClick={() => update({ rest: rest.paused ? resumeRest(rest) : pauseRest(rest) })}
                >
                  {rest.paused ? <Play size={17} /> : <Pause size={17} />}
                </button>
                <button className="text-button" onClick={() => update({ rest: null })}>
                  Skip rest
                </button>
              </div>
            ) : (
              <button
                className="rest-start"
                onClick={() => update({ rest: startRest(Date.now(), restSeconds) })}
              >
                <Timer size={16} /> Start {restSeconds}-second rest
              </button>
            )}
            <div className="session-actions">
              <button
                className="outline"
                disabled={index === 0}
                onClick={() => update({ index: index - 1, rest: null })}
              >
                <ChevronLeft size={18} /> Back
              </button>
              {allDone ? (
                <button className="primary" onClick={onFinish}>
                  {Object.keys(draft.skipped || {}).length
                    ? 'Save partial session'
                    : 'Finish workout'}{' '}
                  <Check size={18} />
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={!done.includes(index) && !isSkipped}
                  onClick={nextExercise}
                >
                  Next exercise <ArrowRight size={18} />
                </button>
              )}
            </div>
            {!isSkipped && (
              <label className="skip-exercise">
                Can’t do this movement?
                <select
                  aria-label="Skip exercise reason"
                  value=""
                  onChange={(event) => {
                    if (event.target.value)
                      update({
                        skipped: { ...draft.skipped, [exercise.name]: event.target.value },
                        rest: null,
                      });
                  }}
                >
                  <option value="">Choose a reason to skip</option>
                  <option>Pain or discomfort</option>
                  <option>Equipment unavailable</option>
                  <option>Too difficult today</option>
                </select>
              </label>
            )}
            <p className="session-bottom-note">
              Log actual results, even below the target. Skipped exercises are saved honestly as a
              partial session. Progression suggestions use your previous results; they don’t change
              your load automatically.
            </p>
          </>
        ) : (
          <p>No suitable exercises remain. Review your preferences before starting.</p>
        )}
      </div>
    </dialog>
  );
}
