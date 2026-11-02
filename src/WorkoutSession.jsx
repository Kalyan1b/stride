import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Flame, Leaf, Pause, Play, Timer, X } from 'lucide-react';
import ExercisePreview from './ExercisePreview';
export default function WorkoutSession({ workout, done, onToggle, onGuide, onFinish, onClose }) {
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      workout.exercises.findIndex((_, i) => !done.includes(i)),
    ),
  );
  const [started, setStarted] = useState(done.length > 0),
    [remaining, setRemaining] = useState(0),
    [paused, setPaused] = useState(false);
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
    if (remaining <= 0 || paused) return;
    const timeout = setTimeout(() => setRemaining((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [remaining, paused]);
  function complete() {
    if (!done.includes(index)) onToggle(index);
    if (index < workout.exercises.length - 1) {
      setIndex(index + 1);
      setRemaining(60);
      setPaused(false);
    } else {
      const unfinished = workout.exercises.findIndex((_, i) => i !== index && !done.includes(i));
      if (unfinished >= 0) setIndex(unfinished);
    }
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
            <button className="primary wide" onClick={() => setStarted(true)}>
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
                    setIndex(i);
                    setRemaining(0);
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
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={17} /> : <Pause size={17} />}
                </button>
                <button className="text-button" onClick={() => setRemaining(0)}>
                  Skip
                </button>
              </div>
            ) : (
              <button
                className="rest-start"
                onClick={() => {
                  setRemaining(60);
                  setPaused(false);
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
                  setIndex(index - 1);
                  setRemaining(0);
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
              <button className="undo-exercise" onClick={() => onToggle(index)}>
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
