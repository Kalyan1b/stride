import HeightInput from './HeightInput';
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  Heart,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
const goals = [
  { name: 'Build muscle', copy: 'Get stronger, one rep at a time.', Icon: Dumbbell },
  { name: 'Lose fat', copy: 'Build a consistent movement habit.', Icon: Flame },
  { name: 'Improve endurance', copy: 'Go a little further. Feel more capable.', Icon: Target },
  { name: 'Stay active', copy: 'Move more and feel good every day.', Icon: Heart },
];
export default function ProfileWizard({ profile, firstTime, onSave, onClose }) {
  const [draft, setDraft] = useState(profile),
    [step, setStep] = useState(0);
  const dialog = useRef(null),
    heading = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  function setEquipment(value) {
    setDraft((prev) => ({
      ...prev,
      equipment: value,
      hasBench: value === 'Full gym',
      hasStep: value === 'Full gym',
    }));
  }
  function next(e) {
    e.preventDefault();
    if (step < 2) setStep(step + 1);
    else onSave({ ...draft, name: draft.name.trim(), days: Number(draft.days) });
  }
  return (
    <dialog
      ref={dialog}
      className="setup-dialog"
      aria-labelledby="setup-heading"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-padding">
        <button className="close" onClick={onClose} aria-label="Close plan setup">
          <X size={22} />
        </button>
        <span className="eyebrow">
          {firstTime ? 'YOUR NEXT CHAPTER' : 'MAKE IT YOURS'} / {step + 1} OF 3
        </span>
        <div className="setup-steps" aria-label={`Setup step ${step + 1} of 3`}>
          {['Your goal', 'About you', 'Your routine'].map((label, i) => (
            <div key={label} className={i <= step ? 'reached' : ''}>
              <span>{i < step ? <Check size={13} /> : i + 1}</span>
              {label}
            </div>
          ))}
        </div>
        <h2 id="setup-heading" ref={heading} tabIndex={-1}>
          {
            ['What are you working toward?', 'Let’s start with you.', 'Make it fit your life.'][
              step
            ]
          }
        </h2>
        <p className="dialog-intro">
          {
            [
              'Choose the goal that matters most to you right now.',
              'Your height and weight help calculate your BMI reference.',
              'Pick a routine you can keep coming back to.',
            ][step]
          }
        </p>
        <form onSubmit={next}>
          {step === 0 && (
            <div className="goal-options">
              {goals.map(({ name, copy, Icon }) => (
                <label key={name} className={`goal-option ${draft.goal === name ? 'chosen' : ''}`}>
                  <input
                    type="radio"
                    name="goal"
                    value={name}
                    checked={draft.goal === name}
                    onChange={() => update('goal', name)}
                  />
                  <span className="option-icon">
                    <Icon size={23} />
                  </span>
                  <span>
                    <b>{name}</b>
                    <small>{copy}</small>
                  </span>
                  <span className="radio-mark">{draft.goal === name && <span />}</span>
                </label>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="form-fields">
              <label>
                What should we call you?
                <input
                  autoComplete="given-name"
                  required
                  maxLength={30}
                  pattern=".*\S.*"
                  value={draft.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Your first name"
                />
              </label>
              <div className="form-row">
                <HeightInput
                  height={draft.height}
                  unit={draft.heightUnit || 'cm'}
                  onChange={(height) => update('height', height)}
                  onUnitChange={(unit) => update('heightUnit', unit)}
                />
                <label>
                  Weight <span className="input-unit">kilograms</span>
                  <input
                    inputMode="decimal"
                    type="number"
                    min="30"
                    max="350"
                    step="0.1"
                    required
                    value={draft.weight}
                    onChange={(e) => update('weight', e.target.value)}
                  />
                </label>
              </div>
              <p className="form-hint">
                For adults 18+. BMI is a general reference and doesn’t measure muscle or fitness.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="form-fields">
              <label>
                Your experience
                <select
                  value={draft.experience}
                  onChange={(e) => update('experience', e.target.value)}
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Experienced</option>
                </select>
              </label>
              <label>
                What equipment can you use?
                <select value={draft.equipment} onChange={(e) => setEquipment(e.target.value)}>
                  <option>Full gym</option>
                  <option>Dumbbells</option>
                  <option>Bodyweight only</option>
                </select>
              </label>
              {draft.equipment !== 'Full gym' && (
                <fieldset className="equipment-extras">
                  <legend>Any extra equipment?</legend>
                  {draft.equipment === 'Dumbbells' && (
                    <>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.hasBench === true}
                          onChange={(e) => update('hasBench', e.target.checked)}
                        />{' '}
                        A stable workout bench
                      </label>
                    </>
                  )}
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.hasStep === true}
                      onChange={(e) => update('hasStep', e.target.checked)}
                    />{' '}
                    A low, stable exercise step
                  </label>
                  <p className="form-hint">
                    Leave these off if you don’t have them. We’ll choose exercises that fit.
                  </p>
                </fieldset>
              )}
              <fieldset className="days-field">
                <legend>How many days a week?</legend>
                <div className="day-options">
                  {[2, 3, 4, 5].map((day) => (
                    <label key={day} className={Number(draft.days) === day ? 'chosen' : ''}>
                      <input
                        type="radio"
                        name="days"
                        value={day}
                        checked={Number(draft.days) === day}
                        onChange={() => update('days', day)}
                      />
                      <b>{day}</b>
                      <span>days</span>
                    </label>
                  ))}
                </div>
                <p className="form-hint">
                  Your plan includes recovery days. Changing your routine starts a new plan;
                  completed workouts stay in your history.
                </p>
              </fieldset>
            </div>
          )}
          <div className="setup-actions">
            {step > 0 && (
              <button className="outline" type="button" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button className="primary" type="submit">
              {step === 2 ? (
                <>
                  <Sparkles size={17} /> {firstTime ? 'Create my plan' : 'Update my plan'}
                </>
              ) : (
                <>
                  Continue <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
        <div className="local-note">No account needed. Your plan is saved on this device.</div>
      </div>
    </dialog>
  );
}
