import { toCentimeters, toFeetAndInches, formatHeight } from '../src/height.js';
import assert from 'node:assert/strict';
import {
  buildPlan,
  defaultProfile,
  normalizeProfile,
  isValidProfile,
  normalizeHistory,
  availableEquipment,
} from '../src/workoutPlan.js';
import {
  STORAGE_KEY,
  loadAppState,
  updateProfile,
  updateDraft,
  completeWorkout,
  completedThisWeek,
  normalizeDrafts,
  restMilliseconds,
  startRest,
  pauseRest,
  resumeRest,
  resolvedWorkout,
} from '../src/appState.js';
import { exerciseGuides } from '../src/exerciseData.js';
const data = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
  },
});
const fresh = () => {
  data.clear();
  return loadAppState().state;
};
const completed = (state) => {
  const workout = resolvedWorkout(state, state.active);
  return updateDraft(state, state.active, {
    index: 3,
    started: true,
    logs: Object.fromEntries(
      workout.exercises.map((item) => [
        item.name,
        {
          effort: 'right',
          sets: Array.from({ length: item.sets }, () => ({
            value: String(item.max),
            weight: item.unit === 'reps' ? '10' : '',
            done: true,
          })),
        },
      ]),
    ),
  });
};
const now = new Date(2026, 10, 2, 12);
let state = fresh();
assert.equal(completeWorkout(state, now), state, 'Incomplete sessions cannot be logged');
state = completeWorkout(completed(state), now);
state = completeWorkout(completed(state), now);
assert.equal(state.history.length, 2, 'Repeated workouts on the same day must remain separate');
assert.notEqual(state.history[0].id, state.history[1].id);
assert.ok(completedThisWeek(state, 0, now));
const originalSnapshot = JSON.stringify(state.history);
const changed = updateProfile(state, { ...state.profile, goal: 'Improve endurance' });
assert.notEqual(changed.planId, state.planId);
assert.equal(
  JSON.stringify(changed.history),
  originalSnapshot,
  'Plan edits must preserve recorded exercise snapshots',
);
assert.equal(
  completedThisWeek(changed, 0, now),
  false,
  'Old plan completions must not mark a new plan done',
);
const resumed = updateDraft(state, 0, {
  done: [0],
  index: 1,
  started: true,
  rest: pauseRest(startRest(), Date.now() + 10000),
});
const cosmetic = updateProfile(resumed, { ...resumed.profile, name: 'New name', weight: 76 });
assert.equal(
  cosmetic.planId,
  resumed.planId,
  'Name/measurement edits must not discard the workout',
);
assert.deepEqual(cosmetic.drafts, resumed.drafts);
data.set(STORAGE_KEY, JSON.stringify(resumed));
const restored = loadAppState().state;
assert.equal(restored.planId, resumed.planId);
assert.deepEqual(restored.drafts, resumed.drafts);
assert.equal(restored.history.length, 2);
// A backgrounded timer uses its deadline instead of extending after missed callbacks.
const running = startRest(1000);
assert.equal(restMilliseconds(running, 31000), 30000);
assert.equal(restMilliseconds(running, 121000), 0);
const paused = pauseRest(running, 11000);
assert.equal(restMilliseconds(paused, 900000), 50000);
assert.equal(restMilliseconds(resumeRest(paused, 900000), 910000), 40000);
assert.equal(restMilliseconds(resumeRest(paused, 900000), 960000), 0);
assert.equal(
  normalizeDrafts(
    {
      0: {
        done: [0, 0, -1, 12, '1'],
        index: 55,
        started: true,
        rest: { paused: false, endsAt: NaN },
      },
    },
    state.profile,
  )[0].done.length,
  0,
);
assert.equal(
  normalizeDrafts({ 0: { done: [], index: 0, rest: running } }, state.profile, 121000)[0].rest,
  null,
);
// Keep old data readable, but do not guess the plan to which an old session belonged.
data.clear();
const oldProfile = JSON.stringify({ ...defaultProfile, name: 'Legacy user' });
const oldHistory = JSON.stringify([
  '2026-11-02-0',
  { id: 'old', date: '2026-11-01', workoutId: 1, title: 'A previous workout' },
]);
data.set('form-profile', oldProfile);
data.set('form-completed', oldHistory);
const migrated = loadAppState().state;
assert.equal(migrated.profile.name, 'Legacy user');
assert.equal(migrated.history.length, 2);
assert.equal(completedThisWeek(migrated, 0, now), false);
assert.equal(data.get('form-profile'), oldProfile);
assert.equal(data.get('form-completed'), oldHistory);
for (const malformed of [
  null,
  [],
  true,
  'invalid',
  {
    name: null,
    height: 0,
    weight: Infinity,
    days: 999,
    goal: 'invalid',
    experience: [],
    equipment: null,
  },
]) {
  const normalized = normalizeProfile(malformed);
  assert.ok(isValidProfile(normalized));
  assert.ok(Number.isFinite(normalized.weight / (normalized.height / 100) ** 2));
}
assert.equal(normalizeHistory([{ id: 'bad', date: 'not-a-date', workoutId: 0 }]).length, 0);
assert.equal(normalizeHistory([{ id: 'bad', date: '2026-02-30', workoutId: 0 }]).length, 0);
assert.equal(normalizeHistory([{ id: 'bad', date: '2026-11-02', workoutId: -1 }]).length, 0);
assert.equal(normalizeHistory([null, 12, [], {}, 'bad']).length, 0);
assert.equal(normalizeHistory(['2024-02-29-0']).length, 1);
const duplicate = { id: 'duplicate', date: '2026-11-02', workoutId: 0 };
assert.equal(normalizeHistory([duplicate, duplicate]).length, 1);
let configurations = 0;
for (const goal of ['Build muscle', 'Lose fat', 'Improve endurance', 'Stay active'])
  for (const experience of ['Beginner', 'Intermediate', 'Experienced'])
    for (const equipment of ['Full gym', 'Dumbbells', 'Bodyweight only'])
      for (const days of [2, 3, 4, 5])
        for (const extras of equipment === 'Full gym'
          ? [{}]
          : [
              { hasBench: false, hasStep: false },
              { hasBench: true, hasStep: false },
              { hasBench: false, hasStep: true },
              { hasBench: true, hasStep: true },
            ]) {
          const profile = normalizeProfile({
            ...defaultProfile,
            goal,
            experience,
            equipment,
            days,
            ...extras,
          });
          const available = availableEquipment(profile);
          const plan = buildPlan(profile);
          assert.equal(plan.length, days);
          assert.deepEqual(
            plan,
            buildPlan(profile),
            'Session variety must stay stable across refreshes',
          );
          const sessionLists = plan.map((workout) =>
            workout.exercises.map((item) => item.name).join('|'),
          );
          assert.equal(
            new Set(sessionLists).size,
            days,
            'Every scheduled session needs a distinct exercise list',
          );
          for (const workout of plan) {
            assert.equal(new Set(workout.exercises.map((item) => item.name)).size, 4);
            for (const exercise of workout.exercises) {
              assert.ok(exerciseGuides[exercise.name]);
              assert.ok(
                exercise.requiredEquipment.every((requirement) => available.includes(requirement)),
                `${equipment}: unavailable equipment for ${exercise.name}`,
              );
            }
          }
          configurations++;
        }
console.log(
  `PASS: unique session history, plan versions and snapshots, migration, invalid saved data, refresh recovery, deadline timers, and ${configurations} equipment configurations.`,
);

const muscleWeek = buildPlan({ ...defaultProfile, days: 5 });
const names = new Set(muscleWeek.flatMap((workout) => workout.exercises.map((item) => item.name)));
for (const name of [
  'Dumbbell Romanian deadlift',
  'Split squat',
  'Standing calf raise',
  'Dumbbell lateral raise',
  'Dumbbell rear-delt fly',
]) {
  assert.ok(names.has(name), `Missing leg or shoulder coverage: ${name}`);
}
const twiceWeekly = buildPlan({ ...defaultProfile, days: 2 });
assert.ok(twiceWeekly.every((workout) => workout.title.startsWith('Full-body')));
console.log(
  'PASS: distinct stable sessions, leg/shoulder coverage, and two-day full-body training.',
);

assert.equal(toCentimeters(5, 9), 175.26);
assert.equal(toCentimeters(6, 0), 182.88);
assert.equal(toCentimeters('', 9), '');
assert.equal(toCentimeters(5, ''), '');
assert.deepEqual(toFeetAndInches(182.88), { feet: 6, inches: 0 });
assert.deepEqual(toFeetAndInches(175.26), { feet: 5, inches: 9 });
assert.equal(formatHeight({ height: 175.26, heightUnit: 'ft' }), '5 ft 9 in');
assert.equal(normalizeProfile({ ...defaultProfile, heightUnit: 'invalid' }).heightUnit, 'cm');
const imperialProfile = updateProfile(state, {
  ...state.profile,
  height: 175.26,
  heightUnit: 'ft',
});
assert.equal(
  imperialProfile.planId,
  state.planId,
  'Changing height units must preserve the current plan',
);
assert.equal(imperialProfile.profile.height, 175.26);
assert.equal(imperialProfile.profile.heightUnit, 'ft');
console.log('PASS: metric/imperial conversion, stored units, and plan preservation.');
