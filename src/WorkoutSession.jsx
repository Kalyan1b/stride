import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Flame, Leaf, Pause, Play, Timer, X } from 'lucide-react';
import ExercisePreview from './ExercisePreview';
import { restMilliseconds, startRest, pauseRest, resumeRest } from './appState';
export default function WorkoutSession({ workout, draft, onUpdate, onGuide, onFinish, onClose }) {
  const { index, started, done, rest } = draft;
  const [now, setNow] = useState(Date.now);
  const remaining = Math.ceil(restMilliseconds(rest, now) / 1000);
  const paused = rest?.paused === true;
  const ref = useRef(null);
  const heading = useRef(null);
  const exercise = workout.exercises[index];
  useEffect(() => {
    ref.current.showModal();
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [index, started]);
  useEffect(() => {
    if (!rest || rest.paused || restMilliseconds(rest) === 0) return;
    let timer;
    const refresh = () => {
      const current = Date.now();
      setNow(current);
      if (restMilliseconds(rest, current) === 0) clearInterval(timer);
    };
    refresh();
    timer = setInterval(refresh, 250);
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
  function complete() {
    const checked = done.includes(index) ? done : [...done, index];
    const unfinished = workout.exercises.findIndex((_, i) => !checked.includes(i));
    const next =
      index < workout.exercises.length - 1 ? index + 1 : unfinished >= 0 ? unfinished : index;
    update({
      done: checked,
      index: next,
      rest: checked.length < workout.exercises.length ? startRest() : null,
    });
  }
  const allDone = done.length === workout.exercises.length;
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
            <div className="warmup-icon">
              <Flame size={36} />
            </div>
            <h2 ref={heading} tabIndex={-1} id="session-heading">
              A little warm-up.
              <br />A better workout.
            </h2>
            <p className="dialog-intro">
              Take 5 minutes to ease into movement before your first exercise.
            </p>
            <div className="warmup-list">
              <span>
                <Check size={17} /> Walk or march gently for 2 minutes
              </span>
              <span>
                <Check size={17} /> Roll your shoulders and circle your arms
              </span>
              <span>
                <Check size={17} /> Try a few easy, unweighted squats
              </span>
            </div>
            <div className="session-tip">
              <Leaf size={18} />
              <p>
                Choose a comfortable effort. Stop if you feel pain and take breaks whenever you need
                them.
              </p>
            </div>
            <button className="primary wide" onClick={() => update({ started: true })}>
              I’m warmed up. Let’s go <ArrowRight size={18} />
            </button>
          </>
        ) : (
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
                  onClick={() => {
                    update({ index: i, rest: null });
                  }}
                  aria-label={`Exercise ${i + 1}: ${item.name}${done.includes(i) ? ', complete' : ''}`}
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
              <DumbbellMark />
              <div>
                <strong>{exercise.prescription}</strong>
                <span>{exercise.focus} · Move slowly and keep control.</span>
              </div>
            </div>
            {remaining > 0 ? (
              <div
                className="rest-timer"
                role="timer"
                aria-label={`${remaining} seconds of rest remaining`}
              >
                <Timer size={20} />
                <div>
                  <b>Take a breather</b>
                  <span>{paused ? 'Timer paused' : 'Rest before your next exercise'}</span>
                </div>
                <strong>
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </strong>
                <button
                  aria-label={paused ? 'Resume rest timer' : 'Pause rest timer'}
                  onClick={() => update({ rest: paused ? resumeRest(rest) : pauseRest(rest) })}
                >
                  {paused ? <Play size={17} /> : <Pause size={17} />}
                </button>
                <button className="text-button" onClick={() => update({ rest: null })}>
                  Skip
                </button>
              </div>
            ) : (
              <button
                className="rest-start"
                onClick={() => {
                  update({ rest: startRest() });
                }}
              >
                <Timer size={16} /> Need a break? Start a 60-second rest
              </button>
            )}
            <div className="session-actions">
              <button
                className="outline"
                disabled={index === 0}
                onClick={() => {
                  update({ index: index - 1, rest: null });
                }}
              >
                <ChevronLeft size={18} /> Back
              </button>
              {allDone ? (
                <button className="primary" onClick={onFinish}>
                  Finish workout <Check size={18} />
                </button>
              ) : (
                <button className="primary" onClick={complete}>
                  {done.includes(index)
                    ? 'Next exercise'
                    : index === workout.exercises.length - 1
                      ? 'Mark exercise complete'
                      : 'Complete & next'}{' '}
                  <Check size={18} />
                </button>
              )}
            </div>
            {done.includes(index) && (
              <button
                className="undo-exercise"
                onClick={() => update({ done: done.filter((i) => i !== index) })}
              >
                Undo this exercise’s checkmark
              </button>
            )}
            <p className="session-bottom-note">
              Rest 60–90 seconds between sets. Finish your workout with gentle stretching.
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
function DumbbellMark() {
  return <span className="prescription-mark">↗</span>;
}
