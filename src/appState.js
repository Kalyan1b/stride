import { normalizeLog } from './training.js';
import {
  buildPlan,
  applySwaps,
  alternatives,
  isValidDate,
  defaultProfile,
  isValidProfile,
  localDate,
  normalizeHistory,
  normalizeProfile,
  readStored,
  saveStored,
  weekStart,
} from './workoutPlan.js';

export const STORAGE_KEY = 'stride-state-v2';
export const PROGRAM_BACKUP_KEY = 'stride-previous-program';
let sequence = 0;
export function newId(prefix) {
  const random =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
export function planSignature(profile) {
  return JSON.stringify({ version: 3, goal: profile.goal, workouts: buildPlan(profile) });
}
export const emptyDraft = () => ({
  done: [],
  index: 0,
  started: false,
  rest: null,
  logs: {},
  swaps: {},
  skipped: {},
  restSeconds: null,
});
export function restMilliseconds(rest, now = Date.now()) {
  if (!rest) return 0;
  return rest.paused ? Math.max(0, rest.remainingMs) : Math.max(0, (rest.endsAt || 0) - now);
}
export const startRest = (now = Date.now(), seconds = 60) => ({
  endsAt: now + seconds * 1000,
  remainingMs: seconds * 1000,
  paused: false,
});
export function pauseRest(rest, now = Date.now()) {
  return { endsAt: null, remainingMs: restMilliseconds(rest, now), paused: true };
}
export function resumeRest(rest, now = Date.now()) {
  const remainingMs = restMilliseconds(rest, now);
  return { endsAt: now + remainingMs, remainingMs, paused: false };
}
function normalizeRest(input, now) {
  if (!input || typeof input !== 'object') return null;
  if (
    input.paused === true &&
    Number.isFinite(input.remainingMs) &&
    input.remainingMs > 0 &&
    input.remainingMs <= 300000
  ) {
    return { endsAt: null, remainingMs: input.remainingMs, paused: true };
  }
  if (
    input.paused === false &&
    Number.isFinite(input.endsAt) &&
    input.endsAt > now &&
    input.endsAt <= now + 300000
  ) {
    return { endsAt: input.endsAt, remainingMs: input.endsAt - now, paused: false };
  }
  return null;
}
export function normalizeDrafts(input, profile, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const drafts = {};
  for (const workout of buildPlan(profile)) {
    const entry = input[workout.id];
    if (!entry || typeof entry !== 'object' || !Array.isArray(entry.done)) continue;
    const resolved = applySwaps(workout, entry.swaps, profile);
    const logs = {},
      swaps = {},
      skipped = {};
    resolved.exercises.forEach((item, index) => {
      logs[item.name] = normalizeLog(entry.logs?.[item.name], item);
      if (item.name !== workout.exercises[index].name) swaps[index] = item.name;
      if (typeof entry.skipped?.[item.name] === 'string' && entry.skipped[item.name])
        skipped[item.name] = entry.skipped[item.name].slice(0, 100);
    });
    const done = resolved.exercises.flatMap((item, index) =>
      !skipped[item.name] && logs[item.name].effort && logs[item.name].sets.every((row) => row.done)
        ? [index]
        : [],
    );
    drafts[workout.id] = {
      done,
      logs,
      swaps,
      skipped,
      restSeconds: [30, 60, 90, 120, 180, 300].includes(entry.restSeconds)
        ? entry.restSeconds
        : null,
      index:
        Number.isInteger(entry.index) && entry.index >= 0 && entry.index < workout.exercises.length
          ? entry.index
          : 0,
      started: entry.started === true || done.length > 0,
      rest: normalizeRest(entry.rest, now),
    };
  }
  return drafts;
}
function initialSchedule(profile, now = new Date()) {
  return Object.fromEntries(
    buildPlan(profile).map((workout) => {
      const date = new Date(`${weekStart(now)}T12:00:00`);
      date.setDate(date.getDate() + workout.day);
      return [workout.id, localDate(date)];
    }),
  );
}
function freshState(profile = defaultProfile) {
  const normalized = normalizeProfile(profile);
  return {
    version: 2,
    profile: normalized,
    personalized: false,
    planId: newId('plan'),
    signature: planSignature(normalized),
    history: [],
    drafts: {},
    active: 0,
    scheduledDates: initialSchedule(normalized),
  };
}
export function loadAppState() {
  const saved = readStored(STORAGE_KEY, null);
  if (saved && typeof saved === 'object' && !Array.isArray(saved) && saved.version === 2) {
    const state = freshState(saved.profile);
    const samePlan = saved.signature === state.signature;
    if (!samePlan && typeof saved.signature === 'string' && saved.signature.includes('"version":2'))
      saveStored(PROGRAM_BACKUP_KEY, saved);
    const validId =
      typeof saved.planId === 'string' && saved.planId.length > 0 && saved.planId.length <= 200;
    state.personalized = saved.personalized === true && isValidProfile(saved.profile);
    state.history = normalizeHistory(saved.history);
    if (samePlan && saved.scheduledDates && typeof saved.scheduledDates === 'object') {
      for (const workout of buildPlan(state.profile)) {
        if (isValidDate(saved.scheduledDates[workout.id]))
          state.scheduledDates[workout.id] = saved.scheduledDates[workout.id];
      }
    }
    if (samePlan && validId) {
      state.planId = saved.planId;
      state.drafts = normalizeDrafts(saved.drafts, state.profile);
    }
    const count = buildPlan(state.profile).length;
    if (Number.isInteger(saved.active) && saved.active >= 0 && saved.active < count)
      state.active = saved.active;
    return {
      state,
      notice:
        !isValidProfile(saved.profile) ||
        !Array.isArray(saved.history) ||
        state.history.length !== saved.history.length
          ? 'Some saved details were invalid. Valid history was kept; please review your profile.'
          : !samePlan
            ? 'Your updated program is ready. Previous workout history is kept; review the new sessions before starting.'
            : '',
    };
  }
  // Preserve the original keys; migration never removes a user's previous data.
  const legacy = readStored('form-profile', null);
  const state = freshState(legacy || defaultProfile);
  state.personalized = isValidProfile(legacy);
  state.history = normalizeHistory(readStored('form-completed', []));
  return {
    state,
    notice:
      legacy && !isValidProfile(legacy)
        ? 'Some saved details were invalid. Please review your profile.'
        : '',
  };
}
export function updateProfile(state, input) {
  const profile = normalizeProfile(input),
    signature = planSignature(profile);
  const changed = signature !== state.signature;
  return {
    ...state,
    profile,
    signature,
    personalized: true,
    planId: changed ? newId('plan') : state.planId,
    drafts: changed ? {} : state.drafts,
    active: changed ? 0 : state.active,
    scheduledDates: changed ? initialSchedule(profile) : state.scheduledDates,
  };
}
export function updateDraft(state, workoutId, patch) {
  const next = { ...emptyDraft(), ...state.drafts[workoutId], ...patch };
  const drafts = normalizeDrafts({ [workoutId]: next }, state.profile);
  return { ...state, drafts: { ...state.drafts, [workoutId]: drafts[workoutId] || emptyDraft() } };
}
export function completeWorkout(state, now = new Date()) {
  const workout = resolvedWorkout(state, state.active);
  const draft = normalizeDrafts(state.drafts, state.profile)[state.active] || emptyDraft();
  if (
    !workout.exercises.length ||
    !workout.exercises.every(
      (item, index) => draft.done.includes(index) || draft.skipped?.[item.name],
    )
  )
    return state;
  const record = {
    id: newId('session'),
    date: localDate(now),
    completedAt: now.toISOString(),
    workoutId: workout.id,
    planId: state.planId,
    title: workout.title,
    status: Object.keys(draft.skipped || {}).length ? 'partial' : 'complete',
    performance: workout.exercises.map((item) => ({
      name: item.name,
      unit: item.unit,
      perSide: item.perSide,
      effort: draft.logs?.[item.name]?.effort || '',
      skipped: draft.skipped?.[item.name] || '',
      sets: (draft.logs?.[item.name]?.sets || [])
        .filter((row) => row.done)
        .map(({ value, weight }) => ({ value, weight })),
    })),
    snapshot: {
      goal: state.profile.goal,
      equipment: state.profile.equipment,
      exercises: workout.exercises.map(({ name, prescription }) => ({ name, prescription })),
    },
  };
  const drafts = { ...state.drafts };
  delete drafts[state.active];
  return { ...state, history: [...state.history, record], drafts };
}
export function completedThisWeek(state, workoutId, now = new Date()) {
  const start = weekStart(now),
    today = localDate(now);
  return state.history.some(
    (record) =>
      record.status !== 'partial' &&
      record.planId === state.planId &&
      record.workoutId === workoutId &&
      record.date >= start &&
      record.date <= today,
  );
}

export function resolvedWorkout(state, id) {
  const base = buildPlan(state.profile).find((workout) => workout.id === id);
  return applySwaps(base, state.drafts[id]?.swaps, state.profile);
}
export function swapExercise(state, workoutId, index, name) {
  const workout = resolvedWorkout(state, workoutId),
    item = workout.exercises[index];
  const draft = state.drafts[workoutId] || emptyDraft();
  const base = buildPlan(state.profile)[workoutId].exercises[index];
  if (
    draft.logs?.[item.name]?.sets.some((row) => row.done) ||
    workout.exercises.some((entry) => entry.name === name)
  )
    return state;
  const swaps = { ...draft.swaps };
  if (name === base.name) delete swaps[index];
  else if (alternatives(base, state.profile).some((option) => option.name === name))
    swaps[index] = name;
  else return state;
  return updateDraft(state, workoutId, { swaps, rest: null });
}
export function scheduledDate(state, id, now = new Date()) {
  const assigned = state.scheduledDates?.[id];
  if (
    assigned &&
    (assigned >= weekStart(now) ||
      !state.history.some(
        (record) =>
          record.planId === state.planId &&
          record.workoutId === id &&
          record.status !== 'partial' &&
          record.date >= assigned,
      ))
  )
    return assigned;
  const workout = buildPlan(state.profile)[id];
  const date = new Date(`${weekStart(now)}T12:00:00`);
  date.setDate(date.getDate() + workout.day);
  return localDate(date);
}
export function moveSession(state, id, date) {
  if (!isValidDate(date) || !buildPlan(state.profile).some((workout) => workout.id === id))
    return state;
  if (
    buildPlan(state.profile).some(
      (workout) => workout.id !== id && scheduledDate(state, workout.id) === date,
    )
  )
    return state;
  return { ...state, scheduledDates: { ...state.scheduledDates, [id]: date } };
}
export function resumeSchedule(state, now = new Date()) {
  const scheduledDates = { ...state.scheduledDates };
  const completedDates = new Set(
    state.history.filter((record) => record.planId === state.planId).map((record) => record.date),
  );
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  const previous = new Date(cursor);
  previous.setDate(previous.getDate() - 1);
  if (completedDates.has(localDate(previous))) cursor.setDate(cursor.getDate() + 1);
  for (const workout of buildPlan(state.profile)) {
    if (completedThisWeek(state, workout.id, now)) continue;
    while (completedDates.has(localDate(cursor))) cursor.setDate(cursor.getDate() + 1);
    scheduledDates[workout.id] = localDate(cursor);
    cursor.setDate(cursor.getDate() + 2);
  }
  return { ...state, scheduledDates };
}
