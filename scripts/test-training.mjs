import assert from 'node:assert/strict';
import {
  buildPlan,
  defaultProfile,
  normalizeProfile,
  normalizeHistory,
  alternatives,
  availableEquipment,
  localDate,
} from '../src/workoutPlan.js';
import {
  emptyDraft,
  loadAppState,
  updateDraft,
  updateProfile,
  resolvedWorkout,
  swapExercise,
  completeWorkout,
  scheduledDate,
  moveSession,
  resumeSchedule,
  completedThisWeek,
  STORAGE_KEY,
  PROGRAM_BACKUP_KEY,
} from '../src/appState.js';
import {
  movement,
  normalizeLog,
  progression,
  latestPerformance,
  estimateMinutes,
} from '../src/training.js';
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
let state = loadAppState().state;
const base = resolvedWorkout(state, 0),
  first = base.exercises[0];
assert.equal(
  updateDraft(state, 0, { done: [0, 1, 2, 3] }).drafts[0].done.length,
  0,
  'A checkmark cannot fabricate completed sets',
);
state = updateDraft(state, 0, {
  started: true,
  logs: { [first.name]: { effort: 'easy', sets: [{ value: '12', weight: '10', done: true }] } },
});
assert.equal(state.drafts[0].logs[first.name].sets[0].done, true);
assert.equal(state.drafts[0].done.length, 0, 'All prescribed sets are required');
assert.equal(completeWorkout(state), state);
const candidate = alternatives(first, state.profile)[0];
assert.equal(swapExercise(state, 0, 0, candidate.name), state, 'Logged sets lock the exercise');
state = updateDraft(state, 0, { logs: {} });
state = swapExercise(state, 0, 0, candidate.name);
assert.equal(resolvedWorkout(state, 0).exercises[0].name, candidate.name);
stored.set(STORAGE_KEY, JSON.stringify(state));
state = loadAppState().state;
assert.equal(resolvedWorkout(state, 0).exercises[0].name, candidate.name, 'Swaps persist');
state = swapExercise(state, 0, 0, first.name);
assert.equal(
  resolvedWorkout(state, 0).exercises[0].name,
  first.name,
  'Original exercise can be restored',
);
function logWorkout(input, skipped = false) {
  const workout = resolvedWorkout(input, input.active);
  return updateDraft(input, input.active, {
    started: true,
    skipped: skipped ? { [workout.exercises.at(-1).name]: 'Pain or discomfort' } : {},
    logs: Object.fromEntries(
      workout.exercises.map((item) => [
        item.name,
        {
          effort: 'easy',
          sets: Array.from({ length: item.sets }, () => ({
            value: String(item.max),
            weight: item.unit === 'reps' ? '10' : '',
            done: true,
          })),
        },
      ]),
    ),
  });
}
state = completeWorkout(logWorkout(state));
assert.equal(state.history.length, 1);
assert.equal(state.history[0].performance.length, base.exercises.length);
assert.equal(state.history[0].performance[0].sets.length, first.sets);
assert.deepEqual(
  normalizeHistory(state.history),
  state.history,
  'Performance records survive serialization',
);
const previous = latestPerformance(state.history, first.name);
assert.ok(progression(first, previous).includes('smallest available weight increase'));
assert.ok(progression(first, { ...previous, effort: 'hard' }).includes('less load'));
assert.ok(!progression(first, { ...previous, effort: 'right' }).includes('smallest available'));
assert.ok(progression(first, { ...previous, date: '2020-01-01' }).includes('Start easier'));
assert.ok(
  progression(first, { ...previous, skipped: 'Pain or discomfort' }).includes(
    'Don’t push through pain',
  ),
);
state = completeWorkout(logWorkout(state, true));
assert.equal(state.history.at(-1).status, 'partial');
assert.ok(state.history.at(-1).performance.at(-1).skipped);
assert.equal(
  state.history.at(-1).performance.at(-1).sets.length,
  resolvedWorkout(state, state.active).exercises.at(-1).sets,
  'Actual logged sets remain available even when the exercise is subsequently skipped',
);
const partialOnly = { ...state, history: [state.history.at(-1)] };
assert.equal(completedThisWeek(partialOnly, 0), false);
assert.equal(
  normalizeLog({ sets: [{ value: '-1', weight: 'NaN', done: true }] }, first).sets[0].done,
  false,
);
assert.equal(
  normalizeLog({ sets: [{ value: '1.5', weight: '10', done: true }] }, first).sets[0].done,
  false,
);
assert.equal(
  normalizeLog({ sets: [{ value: '12', weight: '9999', done: true }] }, first).sets[0].done,
  false,
);
const moved = moveSession(state, 1, '2026-12-03');
assert.equal(scheduledDate(moved, 1), '2026-12-03');
assert.equal(moveSession(moved, 2, '2026-12-03'), moved, 'No overlapping appointments');
const rescheduled = resumeSchedule({ ...moved, history: [] }, new Date(2026, 10, 8, 12));
assert.equal(scheduledDate(rescheduled, 0), '2026-11-08');
assert.equal(scheduledDate(rescheduled, 1), '2026-11-10');
assert.deepEqual(rescheduled.drafts, moved.drafts, 'Rescheduling preserves set logs');
assert.equal(rescheduled.planId, moved.planId);
const lastWeek = { ...state, history: [], scheduledDates: { 0: '2026-11-01' } };
assert.equal(
  scheduledDate(lastWeek, 0, new Date(2026, 10, 9, 12)),
  '2026-11-01',
  'Unfinished sessions carry into a later week',
);
const completedWeek = {
  ...lastWeek,
  history: [{ planId: state.planId, workoutId: 0, date: '2026-11-01', status: 'complete' }],
};
assert.equal(
  scheduledDate(completedWeek, 0, new Date(2026, 10, 9, 12)),
  '2026-11-09',
  'Finished sessions recur next week',
);
const changed = updateProfile(state, { ...state.profile, sessionMinutes: 20 });
assert.equal(
  changed.planId,
  state.planId,
  'A larger time allowance without prescription changes should retain progress',
);
assert.deepEqual(changed.history, state.history);
let configurations = 0;
for (const goal of ['Build muscle', 'Lose fat', 'Get stronger', 'Improve endurance', 'Stay active'])
  for (const equipment of ['Full gym', 'Dumbbells', 'Bodyweight only'])
    for (const sessionMinutes of [20, 30, 45, 60])
      for (let mask = 0; mask < 16; mask++) {
        const tags = ['floor', 'overhead', 'kneeling', 'singleLeg'].filter(
          (_, i) => mask & (1 << i),
        );
        const profile = normalizeProfile({
          ...defaultProfile,
          goal,
          equipment,
          sessionMinutes,
          days: 3,
          preferredDays: [1, 3, 6],
          limitations: tags,
          excludedExercises: ['Reverse lunge'],
        });
        const plan = buildPlan(profile);
        assert.deepEqual(
          plan.map((workout) => workout.day),
          [1, 3, 6],
        );
        for (const workout of plan) {
          assert.ok(
            workout.minutes <= sessionMinutes,
            `Time budget exceeded: ${goal} ${equipment}`,
          );
          assert.equal(workout.minutes, estimateMinutes(workout.exercises));
          assert.equal(
            new Set(workout.exercises.map((item) => item.name)).size,
            workout.exercises.length,
          );
          for (const item of workout.exercises) {
            assert.ok(!movement[item.name][1].some((tag) => tags.includes(tag)));
            assert.notEqual(item.name, 'Reverse lunge');
            assert.ok(
              item.requiredEquipment.every((required) =>
                availableEquipment(profile).includes(required),
              ),
            );
            assert.ok(item.sets >= 1 && item.min > 0 && item.max >= item.min);
          }
        }
        configurations++;
      }
const fat = buildPlan({ ...defaultProfile, goal: 'Lose fat', days: 2 });
assert.ok(fat.every((workout) => workout.type === 'Strength'));
assert.notDeepEqual(fat, buildPlan({ ...defaultProfile, goal: 'Stay active', days: 2 }));
console.log(
  `PASS: set integrity, performance recovery, progression, swaps, partial sessions, calendar carryover, and ${configurations} time/preference combinations.`,
);

const oldProgram = {
  ...state,
  signature: state.signature.replace('"version":3', '"version":2'),
  drafts: { 0: { done: [0], index: 1, started: true, rest: null } },
};
stored.set(STORAGE_KEY, JSON.stringify(oldProgram));
const upgraded = loadAppState();
assert.deepEqual(JSON.parse(stored.get(PROGRAM_BACKUP_KEY)), oldProgram);
assert.equal(upgraded.state.history.length, oldProgram.history.length);
assert.deepEqual(
  upgraded.state.drafts,
  {},
  'Old exercise checkmarks must not become fabricated set logs',
);
assert.ok(upgraded.notice.includes('Previous workout history is kept'));
console.log('PASS: previous-program backup and honest completion-only migration.');
