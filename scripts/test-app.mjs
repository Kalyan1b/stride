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
  status: 'complete',
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
  const setInput = async (input, value) => {
    await act(async () => {
      inputSetter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  await click(button('ft / in'));
  const parts = () => document.querySelectorAll('.height-parts input');
  await setInput(parts()[0], '5');
  await setInput(parts()[1], '12');
  assert.equal(
    document.querySelector('.setup-dialog form').checkValidity(),
    false,
    'Inches must be below 12',
  );
  await setInput(parts()[1], '9');
  await setInput(parts()[0], '2');
  assert.equal(
    document.querySelector('.setup-dialog form').checkValidity(),
    false,
    'Combined height must meet the supported range',
  );
  await setInput(parts()[0], '5');
  await setInput(parts()[1], '');
  assert.equal(
    document.querySelector('.setup-dialog form').checkValidity(),
    false,
    'Both imperial fields are required',
  );
  await setInput(parts()[1], '9');
  await click(button('cm', document.querySelector('.height-unit-options')));
  assert.equal(document.querySelector('.height-field input').value, '175.26');
  await click(button('ft / in'));
  assert.equal(parts()[0].value, '5');
  assert.equal(parts()[1].value, '9');
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
  const savedHeight = JSON.parse(localStorage.getItem(STORAGE_KEY)).profile;
  assert.equal(savedHeight.height, 175.26);
  assert.equal(savedHeight.heightUnit, 'ft');
  assert.ok(document.querySelector('.body-values').textContent.includes('5 ft 9 in'));
  assert.ok(
    document
      .querySelector('.bmi-result')
      .textContent.includes((savedHeight.weight / 1.7526 ** 2).toFixed(1)),
  );
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
  async function logCurrentExercise() {
    const rows = document.querySelectorAll('.set-row');
    for (let i = 0; i < rows.length; i++) {
      const row = document.querySelectorAll('.set-row')[i];
      const field = row.querySelector('input');
      if (!field.disabled) {
        await setInput(field, '12');
        await click(row.querySelector('button'));
      }
    }
    await click(button('About right'));
  }
  await logCurrentExercise();
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
    'Bodyweight squat',
    'Closing and reopening should preserve logged sets',
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
  await click(button('Next exercise'));
  await logCurrentExercise();
  await click(button('Next exercise'));
  await logCurrentExercise();
  await click(button('Next exercise'));
  await logCurrentExercise();
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
  for (let i = 0; i < 4; i++) {
    await logCurrentExercise();
    if (i < 3) await click(button('Next exercise'));
  }
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
  assert.equal(parts()[0].value, '5', 'Saved feet must be restored when reopening settings');
  assert.equal(parts()[1].value, '9');
  assert.equal(
    document.querySelector('.height-unit-options button[aria-pressed="true"]').textContent.trim(),
    'ft / in',
  );
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
  const healthyState = JSON.parse(localStorage.getItem(STORAGE_KEY));
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
    if (document.querySelector('.real-demo-stage img')) {
      assert.ok(document.querySelector('.real-demo-stage img').src.endsWith('.gif'));
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(healthyState));
  await act(async () => root.render(React.createElement(App)));
  await click(document.querySelector('.profile-button'));
  await submit();
  await submit();
  const timeSelect = [...document.querySelectorAll('.setup-dialog select')].find((select) =>
    select.textContent.includes('Up to 20 minutes'),
  );
  await act(async () => {
    timeSelect.value = '20';
    timeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const dayBoxes = () => document.querySelectorAll('.weekday-options input');
  await click(dayBoxes()[1]);
  await submit();
  assert.ok(document.querySelector('.setup-error').textContent.includes('exactly 2'));
  await click(dayBoxes()[3]);
  const overhead = [...document.querySelectorAll('.preference-field label')].find((label) =>
    label.textContent.includes('Avoid overhead'),
  );
  await click(overhead.querySelector('input'));
  await submit();
  let current = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(current.profile.sessionMinutes, 20);
  assert.deepEqual(current.profile.preferredDays, [1, 3]);
  assert.ok(current.profile.limitations.includes('overhead'));
  await click(document.querySelector('.schedule-editor summary'));
  const dateInput = document.querySelector('.schedule-list input');
  await setInput(dateInput, '2026-12-10');
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).scheduledDates[0], '2026-12-10');
  await click(button('Resume from today'));
  await click(button('Start session'));
  await click(button('I’m warmed up. Let’s go'));
  const swapSelect = document.querySelector('[aria-label="Swap exercise"]');
  assert.ok([...swapSelect.options].some((option) => option.value === 'Bodyweight squat'));
  await act(async () => {
    swapSelect.value = 'Bodyweight squat';
    swapSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(document.querySelector('.session-heading-row h2').textContent, 'Bodyweight squat');
  const logButton = document.querySelector('[aria-label="Log set 1"]');
  assert.equal(logButton.disabled, true);
  await setInput(document.querySelector('[aria-label="Set 1 reps"]'), '10');
  await click(document.querySelector('[aria-label="Log set 1"]'));
  assert.equal(document.querySelector('[aria-label="Swap exercise"]').disabled, true);
  assert.equal(button('Next exercise').disabled, true, 'One logged set cannot finish the exercise');
  for (let i = 0; i < 4; i++) {
    const skip = document.querySelector('[aria-label="Skip exercise reason"]');
    await act(async () => {
      skip.value = 'Pain or discomfort';
      skip.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (i < 3) await click(button('Next exercise'));
  }
  await click(button('Save partial session'));
  assert.ok(document.querySelector('.activity-list').textContent.includes('Partial session'));
  current = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(current.history.at(-1).status, 'partial');
  assert.equal(current.history.at(-1).performance[0].name, 'Bodyweight squat');
  assert.equal(current.history.at(-1).performance[0].sets[0].value, '10');
  const performanceSelect = document.querySelector('[aria-label="Performance exercise"]');
  await act(async () => {
    performanceSelect.value = 'Bodyweight squat';
    performanceSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.ok(document.querySelector('.performance-table').textContent.includes('10 reps'));
  console.log(
    'PASS: setup time/day/limitation validation, moving sessions, exercise swaps, set completion guards, partial-session results, and performance history.',
  );

  console.log(
    'PASS: setup, demonstrations, refresh recovery, paused rest recovery, repeated sessions, plan-change history, corrupt-data recovery, and visible storage failures.',
  );
} finally {
  if (root) await act(async () => root.unmount());
  await unlink(artifact).catch(() => {});
  dom.window.close();
}
