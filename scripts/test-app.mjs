import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { unlink } from 'node:fs/promises';
import {
  buildPlan,
  defaultProfile,
  localDate,
  weekStart,
  normalizeHistory,
} from '../src/workoutPlan.js';
import { exerciseGuides } from '../src/exerciseData.js';
import { STORAGE_KEY } from '../src/appState.js';

// Plan coverage: each configuration must stay within equipment and media availability.
let combinations = 0;
for (const goal of ['Build muscle', 'Lose fat', 'Improve endurance', 'Stay active']) {
  for (const experience of ['Beginner', 'Intermediate', 'Experienced']) {
    for (const equipment of ['Full gym', 'Dumbbells', 'Bodyweight only']) {
      for (const days of [2, 3, 4, 5]) {
        const plan = buildPlan({ ...defaultProfile, goal, experience, equipment, days });
        assert.equal(plan.length, days);
        assert.equal(new Set(plan.map((workout) => workout.day)).size, days);
        for (const workout of plan) {
          assert.equal(workout.exercises.length, 4);
          assert.equal(new Set(workout.exercises.map((item) => item.name)).size, 4);
          for (const item of workout.exercises) {
            assert.ok(exerciseGuides[item.name], `No guide for ${item.name}`);
            if (equipment === 'Bodyweight only')
              assert.ok(!/Dumbbell|Goblet|cable/.test(item.name));
            if (equipment === 'Dumbbells') assert.ok(!/cable/.test(item.name));
          }
          if (workout.title === 'Full-body strength') {
            assert.ok(workout.exercises.some((item) => /squat/.test(item.name)));
            assert.ok(workout.exercises.some((item) => /press|Push-up/.test(item.name)));
          }
        }
        combinations++;
      }
    }
  }
}
assert.equal(weekStart(new Date(2026, 10, 1, 12)), '2026-10-26');
assert.equal(localDate(new Date(2026, 10, 1, 23, 59)), '2026-11-01');
assert.deepEqual(normalizeHistory(['2026-10-31-2'])[0], {
  id: '2026-10-31-2',
  date: '2026-10-31',
  workoutId: 2,
  title: 'Workout completed',
});
console.log(
  `PASS: ${combinations} goal, experience, equipment, and schedule combinations; local dates and legacy progress migration.`,
);

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
});
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLDialogElement',
  'Event',
  'MouseEvent',
  'localStorage',
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
    writable: true,
  });
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { default: React, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const artifact = new URL('../.form-app-test.mjs', import.meta.url);
let root;
try {
  await build({
    stdin: {
      contents:
        "export {default} from './App.jsx'; export {default as ExerciseGuide} from './ExerciseGuide.jsx';",
      resolveDir: new URL('../src/', import.meta.url).pathname,
      loader: 'jsx',
    },
    outfile: artifact.pathname,
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['react', 'react-dom', 'lucide-react'],
    logLevel: 'silent',
    define: { 'import.meta.env.BASE_URL': JSON.stringify('/stride/') },
  });
  const { default: App, ExerciseGuide } = await import(artifact.href);
  const click = async (element) => {
    assert.ok(element, 'Expected a clickable element');
    await act(async () => element.click());
  };
  const button = (text, scope = document) =>
    [...scope.querySelectorAll('button')].find((item) => item.textContent.includes(text));
  const submit = async () => {
    const form = document.querySelector('.setup-dialog form');
    assert.ok(form.checkValidity(), 'Setup form should be valid');
    await act(async () =>
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
  };
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(App)));
  assert.ok(document.querySelector('.welcome-banner'));
  assert.ok(
    document.querySelector('.hero-photo img').src.includes('/stride/exercises/'),
    'Hero media must use the Pages base path',
  );
  await click(button('Let’s build your plan'));
  await click(document.querySelector('input[value="Stay active"]'));
  await submit();
  const nameInput = document.querySelector('input[autocomplete="given-name"]');
  const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    inputSetter.call(nameInput, 'Sam');
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.ok(
    document.querySelector('.setup-dialog form').checkValidity(),
    'Valid names must be accepted',
  );
  inputSetter.call(nameInput, '   ');
  assert.equal(
    document.querySelector('.setup-dialog form').checkValidity(),
    false,
    'Whitespace-only names must be rejected',
  );
  await act(async () => {
    inputSetter.call(nameInput, 'Sam');
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await submit();
  const equipmentSelect = document.querySelectorAll('.setup-dialog select')[1];
  await act(async () => {
    equipmentSelect.value = 'Bodyweight only';
    equipmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await click(document.querySelector('input[name="days"][value="2"]'));
  await submit();
  assert.equal(document.querySelector('.setup-dialog'), null);
  assert.ok(document.querySelector('h1').textContent.includes('Sam'));
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).profile.equipment, 'Bodyweight only');
  assert.equal(document.querySelectorAll('.workout-day').length, 2);
  assert.ok(!document.querySelector('.welcome-banner'));
  await click(button('Watch demo'));
  assert.ok(document.querySelector('.guide-dialog[open]'));
  assert.ok(
    document.querySelector('.real-demo-stage img').src.includes('bodyweight-squat-start.jpg'),
    'Reduced-motion users should see a still image',
  );
  await click(document.querySelector('[aria-label="Close exercise guide"]'));
  await click(button('Start session'));
  assert.ok(document.querySelector('.warmup-list'));
  await click(button('I’m warmed up. Let’s go'));
  assert.equal(document.querySelector('.session-heading-row h2').textContent, 'Bodyweight squat');
  await click(button('Complete & next'));
  assert.ok(document.querySelector('.rest-timer'));
  await click(document.querySelector('[aria-label="Pause rest timer"]'));
  assert.ok(document.querySelector('[aria-label="Resume rest timer"]'));
  await click(document.querySelector('[aria-label="Close workout"]'));
  // A full app remount models refresh: recover the exercise, checkmarks, and paused timer.
  await act(async () => root.unmount());
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(App)));
  await click(button('Resume session'));
  assert.ok(
    document.querySelector('[aria-label="Resume rest timer"]'),
    'Paused rest must survive refresh',
  );
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).drafts[0].done.length, 1);

  assert.equal(
    document.querySelector('.session-heading-row h2').textContent,
    'Push-up',
    'Closing and reopening should preserve checked exercises',
  );
  await click(document.querySelector('[aria-label="Resume rest timer"]'));
  const actualNow = Date.now;
  try {
    Date.now = () => actualNow() + 120000;
    await act(async () => window.dispatchEvent(new Event('focus')));
    assert.equal(
      document.querySelector('.rest-timer'),
      null,
      'Returning after a background delay must expire the rest',
    );
  } finally {
    Date.now = actualNow;
  }
  await click(button('Complete & next'));
  await click(button('Complete & next'));
  await click(button('Mark exercise complete'));
  await click(button('Finish workout'));
  assert.ok(document.querySelector('.celebration-dialog[open]'));
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).history.length, 1);
  await click(button('See my progress', document.querySelector('.celebration-dialog')));
  assert.equal(document.querySelector('.activity-row b').textContent, 'Full-body strength');
  assert.ok(document.querySelector('.progress-feature strong').textContent.includes('1'));
  await act(async () => root.unmount());
  root = null;
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(App)));
  assert.ok(
    document.querySelector('h1').textContent.includes('Sam'),
    'Profile should survive a reload',
  );
  await click(button('Progress', document.querySelector('.sidebar nav')));
  assert.equal(
    document.querySelectorAll('.activity-row').length,
    1,
    'Completed workouts should survive a reload',
  );
  // Completing the same workout twice on the same date must keep both sessions.
  await click(button('Home', document.querySelector('.sidebar nav')));
  await click(button('Start session'));
  await click(button('I’m warmed up. Let’s go'));
  await click(button('Complete & next'));
  await click(button('Complete & next'));
  await click(button('Complete & next'));
  await click(button('Mark exercise complete'));
  await click(button('Finish workout'));
  await click(button('See my progress', document.querySelector('.celebration-dialog')));
  const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY)).history;
  assert.equal(sessions.length, 2);
  assert.notEqual(sessions[0].id, sessions[1].id);
  assert.equal(document.querySelectorAll('.activity-row').length, 2);
  // A new goal must not inherit the old plan's completion checkmarks.
  await click(document.querySelector('.profile-button'));
  await click(document.querySelector('input[value="Build muscle"]'));
  await submit();
  await submit();
  await submit();
  assert.equal(document.querySelectorAll('.workout-day.completed').length, 0);
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).history.length, 2);
  // Equipment controls must actually change the exercises assigned to the user.
  await click(document.querySelector('.profile-button'));
  await submit();
  await submit();
  const extraEquipment = document.querySelectorAll('.setup-dialog select')[1];
  await act(async () => {
    extraEquipment.value = 'Dumbbells';
    extraEquipment.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const bench = document.querySelector('.equipment-extras input[type="checkbox"]');
  assert.equal(bench.checked, false);
  await click(bench);
  await submit();
  assert.ok(document.querySelector('.exercise-list').textContent.includes('Dumbbell bench press'));
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).profile.hasBench, true);
  // Corrupt saved profile fields must never crash the app or produce an invalid BMI.
  await act(async () => root.unmount());
  root = null;
  const broken = JSON.parse(localStorage.getItem(STORAGE_KEY));
  broken.profile = { ...broken.profile, name: null, height: 0, weight: 'invalid', days: 99 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(broken));
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(App)));
  assert.ok(document.querySelector('.welcome-banner'));
  assert.ok(!document.querySelector('main').textContent.includes('NaN'));
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).history.length, 2);
  // Storage failure must be visible, not mistaken for a saved workout.
  await act(async () => root.unmount());
  root = null;
  const realStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => realStorage.getItem(key),
    setItem: () => {
      throw new Error('Storage disabled');
    },
  };
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(App)));
  assert.ok(document.querySelector('.storage-warning[role="alert"]'));
  globalThis.localStorage = realStorage;
  // Open every new demonstration and exercise its playback path.
  for (const name of [
    'Dumbbell Romanian deadlift',
    'Split squat',
    'Standing calf raise',
    'Dumbbell lateral raise',
    'Dumbbell rear-delt fly',
  ]) {
    await act(async () =>
      root.render(React.createElement(ExerciseGuide, { key: name, name, onClose() {} })),
    );
    assert.equal(document.querySelector('#guide-title').textContent, name);
    assert.ok(document.querySelector('.guide-dialog[open]'));
    await click(button('Play'));
    if (name === 'Dumbbell lateral raise') {
      assert.ok(
        document.querySelector('.real-demo-stage img').src.endsWith('dumbbell-lateral-raise.gif'),
      );
    } else {
      const frame = document.querySelector('iframe');
      assert.ok(frame.src.startsWith('https://www.youtube-nocookie.com/embed/'));
      assert.ok(!frame.src.includes('undefined'));
    }
  }
  console.log('PASS: all five new exercise guides open and play their attributed demonstrations.');
  await act(async () =>
    root.render(
      React.createElement(ExerciseGuide, {
        key: 'reverse-lunge',
        name: 'Reverse lunge',
        onClose() {},
      }),
    ),
  );
  const demoImage = () => document.querySelector('.real-demo-stage img');
  assert.ok(
    demoImage().src.endsWith('/stride/exercises/reverse-lunge-start.jpg'),
    'Reduced motion starts with a still',
  );
  assert.ok(document.querySelector('.demo-type').textContent.includes('Real-person GIF'));
  const tutorial = [...document.querySelectorAll('a')].find((link) =>
    link.textContent.includes('Watch full tutorial'),
  );
  assert.equal(tutorial.href, 'https://www.youtube.com/watch?v=xrPteyQLGAo');
  await click(button('Play GIF'));
  assert.ok(demoImage().src.endsWith('/stride/exercises/reverse-lunge.gif'));
  await click(button('Stop GIF'));
  assert.ok(demoImage().src.endsWith('reverse-lunge-start.jpg'));
  await click(button('Lowered position'));
  assert.ok(demoImage().src.endsWith('reverse-lunge-end.jpg'));
  await act(async () => demoImage().dispatchEvent(new Event('error')));
  assert.ok(document.querySelector('.media-unavailable'));
  await click(button('Try again'));
  assert.ok(demoImage());
  console.log(
    'PASS: reverse-lunge GIF playback, pause, still frames, tutorial link, and failure recovery.',
  );
  console.log(
    'PASS: setup, demonstrations, refresh recovery, paused rest recovery, repeated sessions, plan-change history, corrupt-data recovery, and visible storage failures.',
  );
} finally {
  if (root) await act(async () => root.unmount());
  await unlink(artifact).catch(() => {});
  dom.window.close();
}
