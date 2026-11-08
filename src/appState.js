import {
  buildPlan,
  defaultProfile,
  isValidProfile,
  localDate,
  normalizeHistory,
  normalizeProfile,
  readStored,
  weekStart,
} from './workoutPlan.js';

export const STORAGE_KEY = 'stride-state-v2';
let sequence = 0;
export function newId(prefix) {
  const random =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}
export function planSignature(profile) {
  return JSON.stringify({ version: 2, goal: profile.goal, workouts: buildPlan(profile) });
}
export const emptyDraft = () => ({ done: [], index: 0, started: false, rest: null });
export function restMilliseconds(rest, now = Date.now()) {
  if (!rest) return 0;
  return rest.paused ? Math.max(0, rest.remainingMs) : Math.max(0, (rest.endsAt || 0) - now);
}
export const startRest = (now = Date.now()) => ({
  endsAt: now + 60000,
  remainingMs: 60000,
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
    input.remainingMs <= 60000
  ) {
    return { endsAt: null, remainingMs: input.remainingMs, paused: true };
  }
  if (
    input.paused === false &&
    Number.isFinite(input.endsAt) &&
    input.endsAt > now &&
    input.endsAt <= now + 60000
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
    const done = [
      ...new Set(
        entry.done.filter((i) => Number.isInteger(i) && i >= 0 && i < workout.exercises.length),
      ),
    ];
    drafts[workout.id] = {
      done,
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
  };
}
export function loadAppState() {
  const saved = readStored(STORAGE_KEY, null);
  if (saved && typeof saved === 'object' && !Array.isArray(saved) && saved.version === 2) {
    const state = freshState(saved.profile);
    const samePlan = saved.signature === state.signature;
    const validId =
      typeof saved.planId === 'string' && saved.planId.length > 0 && saved.planId.length <= 200;
    state.personalized = saved.personalized === true && isValidProfile(saved.profile);
    state.history = normalizeHistory(saved.history);
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
  };
}
export function updateDraft(state, workoutId, patch) {
  const next = { ...emptyDraft(), ...state.drafts[workoutId], ...patch };
  const drafts = normalizeDrafts({ [workoutId]: next }, state.profile);
  return { ...state, drafts: { ...state.drafts, [workoutId]: drafts[workoutId] || emptyDraft() } };
}
export function completeWorkout(state, now = new Date()) {
  const workout = buildPlan(state.profile)[state.active];
  const draft = state.drafts[state.active] || emptyDraft();
  if (draft.done.length !== workout.exercises.length) return state;
  const record = {
    id: newId('session'),
    date: localDate(now),
    completedAt: now.toISOString(),
    workoutId: workout.id,
    planId: state.planId,
    title: workout.title,
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
      record.planId === state.planId &&
      record.workoutId === workoutId &&
      record.date >= start &&
      record.date <= today,
  );
}
