export const defaultProfile = {
  name: 'Alex',
  height: 175,
  heightUnit: 'cm',
  weight: 75,
  goal: 'Build muscle',
  experience: 'Beginner',
  equipment: 'Full gym',
  days: 3,
};
export const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const schedules = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 6] };
export const equipmentRequirements = {
  'Dumbbell bench press': ['dumbbells', 'bench'],
  'Dumbbell bent-over row': ['dumbbells'],
  'Dumbbell shoulder press': ['dumbbells'],
  'Seated cable row': ['cable'],
  'Goblet squat': ['dumbbells'],
  'Step-up': ['step'],
  'Dumbbell Romanian deadlift': ['dumbbells'],
  'Dumbbell lateral raise': ['dumbbells'],
  'Dumbbell rear-delt fly': ['dumbbells'],
};
const exercise = (name, prescription, focus) => ({
  name,
  prescription,
  focus,
  requiredEquipment: equipmentRequirements[name] || [],
});
export function availableEquipment(profile) {
  if (profile.equipment === 'Full gym') return ['dumbbells', 'bench', 'cable', 'step'];
  return [
    ...(profile.equipment === 'Dumbbells' ? ['dumbbells'] : []),
    ...(profile.hasBench ? ['bench'] : []),
    ...(profile.hasStep ? ['step'] : []),
  ];
}
export function buildPlan(input) {
  const profile = normalizeProfile(input);
  const equipment = availableEquipment(profile);
  const home = profile.equipment === 'Bodyweight only';
  const sets = profile.experience === 'Beginner' ? 2 : profile.experience === 'Experienced' ? 4 : 3;
  const upper = [
    exercise(
      home || !equipment.includes('bench') ? 'Push-up' : 'Dumbbell bench press',
      `${sets} sets · 8–12 reps`,
      'Chest & shoulders',
    ),
    exercise(
      home
        ? 'Prone Y-T raise'
        : profile.equipment === 'Dumbbells'
          ? 'Dumbbell bent-over row'
          : 'Seated cable row',
      `${sets} sets · 10–12 reps`,
      'Back & posture',
    ),
    exercise(
      home
        ? profile.experience === 'Beginner'
          ? 'Bird dog'
          : 'Pike push-up'
        : 'Dumbbell shoulder press',
      `${sets} sets · 8–12 reps`,
      home ? 'Control & stability' : 'Shoulders',
    ),
    exercise('Dead bug', '2 sets · 8 reps / side', 'Core & stability'),
  ];
  const lower = [
    exercise(
      home ? 'Bodyweight squat' : 'Goblet squat',
      `${sets} sets · 10–12 reps`,
      'Quads & glutes',
    ),
    exercise('Glute bridge', `${sets} sets · 12 reps`, 'Glutes & hamstrings'),
    exercise('Reverse lunge', '2 sets · 8 reps / side', 'Legs & balance'),
    exercise('Plank', '3 holds · 20–30 sec', 'Core & stability'),
  ];
  const cardio = [
    exercise(
      'Brisk walk or cycle',
      profile.experience === 'Beginner' ? '20 minutes' : '30 minutes',
      'Comfortable, conversational pace',
    ),
    exercise('Bird dog', '2 sets · 8 reps / side', 'Core & balance'),
    exercise(
      equipment.includes('step') ? 'Step-up' : 'Bodyweight squat',
      '2 sets · 10 reps',
      'Legs & conditioning',
    ),
    exercise('Gentle full-body stretch', '5 minutes', 'Mobility & recovery'),
  ];
  const full = [lower[0], upper[0], upper[1], lower[1]];
  const mobility = [cardio[3], cardio[1], lower[1], upper[3]];
  // Fixed session variants keep the week interesting without changing on refresh.
  const hinge = home
    ? lower[1]
    : exercise('Dumbbell Romanian deadlift', `${sets} sets · 8–12 reps`, 'Hamstrings & glutes');
  const splitSquat = exercise('Split squat', `${sets} sets · 8–10 reps / side`, 'Quads & glutes');
  const calves = exercise('Standing calf raise', '2 sets · 12–20 reps', 'Calves');
  const lateral = home
    ? upper[1]
    : exercise('Dumbbell lateral raise', '2 sets · 10–15 reps', 'Side shoulders');
  const rear = home
    ? upper[1]
    : exercise('Dumbbell rear-delt fly', '2 sets · 10–15 reps', 'Rear shoulders');
  const upperB = [upper[2], upper[1], home ? upper[0] : rear, upper[3]];
  const lowerB = [splitSquat, hinge, equipment.includes('step') ? cardio[2] : lower[2], calves];
  const fullB = [splitSquat, upper[2], upper[1], hinge];
  const conditioningB = [cardio[0], calves, lower[2], cardio[3]];
  const conditioningC = [cardio[0], upper[3], splitSquat, cardio[3]];
  // Two-day muscle plans train the whole body on both days.
  const strengthDays =
    profile.days === 2
      ? [
          ['Full-body strength', full, 'Strength'],
          ['Full-body · shoulders & hinge', fullB, 'Strength'],
        ]
      : [
          [
            home ? 'Upper body & core' : 'Upper body strength',
            [upper[0], upper[1], upper[2], home ? upper[3] : lateral],
            'Strength',
          ],
          ['Lower body strength', [lower[0], hinge, lower[2], calves], 'Strength'],
          ['Full-body strength', full, 'Strength'],
          ['Shoulders & upper body', upperB, 'Strength'],
          ['Lower body · single-leg focus', lowerB, 'Strength'],
        ];
  const balancedDays = [
    ['Full-body strength', full, 'Strength'],
    ['Cardio & core', cardio, 'Cardio'],
    ['Lower body strength', lowerB, 'Strength'],
    ['Easy conditioning', conditioningB, 'Cardio'],
    ['Strength & mobility', mobility, 'Mobility'],
  ];
  const enduranceDays = [
    ['Cardio & core', cardio, 'Cardio'],
    ['Full-body strength', full, 'Strength'],
    ['Steady cardio & mobility', conditioningC, 'Cardio'],
    ['Strength & mobility', mobility, 'Mobility'],
    ['Easy conditioning', conditioningB, 'Cardio'],
  ];
  const days = schedules[Number(profile.days)] || schedules[3];
  const workouts =
    profile.goal === 'Build muscle'
      ? strengthDays
      : profile.goal === 'Improve endurance'
        ? enduranceDays
        : balancedDays;
  return days.map((day, index) => {
    const [title, exercises, type] = workouts[index];
    return {
      id: index,
      day,
      title,
      exercises,
      type,
      minutes:
        type === 'Mobility' ? 25 : type === 'Cardio' && profile.experience !== 'Beginner' ? 45 : 35,
    };
  });
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function weekStart(date = new Date()) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return localDate(day);
}
export function readStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const choices = {
  goal: ['Build muscle', 'Lose fat', 'Improve endurance', 'Stay active'],
  experience: ['Beginner', 'Intermediate', 'Experienced'],
  equipment: ['Full gym', 'Dumbbells', 'Bodyweight only'],
};
function numberInRange(value, minimum, maximum, fallback) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : fallback;
}
export function normalizeProfile(value) {
  const input = isObject(value) ? value : {};
  const profile = { ...defaultProfile };
  profile.name =
    typeof input.name === 'string' && input.name.trim()
      ? input.name.trim().slice(0, 30)
      : defaultProfile.name;
  profile.heightUnit = input.heightUnit === 'ft' ? 'ft' : 'cm';
  profile.height = numberInRange(input.height, 100, 250, defaultProfile.height);
  profile.weight = numberInRange(input.weight, 30, 350, defaultProfile.weight);
  for (const [field, options] of Object.entries(choices)) {
    if (options.includes(input[field])) profile[field] = input[field];
  }
  if ([2, 3, 4, 5].includes(Number(input.days))) profile.days = Number(input.days);
  profile.hasBench = profile.equipment === 'Full gym' || input.hasBench === true;
  profile.hasStep = profile.equipment === 'Full gym' || input.hasStep === true;
  return profile;
}
export function isValidProfile(value) {
  if (!isObject(value)) return false;
  return (
    typeof value.name === 'string' &&
    Boolean(value.name.trim()) &&
    value.name.trim().length <= 30 &&
    numberInRange(value.height, 100, 250, null) !== null &&
    numberInRange(value.weight, 30, 350, null) !== null &&
    Object.entries(choices).every(([field, options]) => options.includes(value[field])) &&
    [2, 3, 4, 5].includes(Number(value.days))
  );
}
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 9999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const unique = new Map();
  for (const entry of history) {
    const legacy = typeof entry === 'string' && /^(\d{4}-\d{2}-\d{2})-[0-4]$/.test(entry);
    const item = legacy
      ? {
          id: entry,
          date: entry.slice(0, 10),
          workoutId: Number(entry.slice(11)),
          title: 'Workout completed',
        }
      : entry;
    if (
      !isObject(item) ||
      typeof item.id !== 'string' ||
      !item.id.trim() ||
      item.id.length > 200 ||
      !isValidDate(item.date)
    )
      continue;
    if (!Number.isInteger(item.workoutId) || item.workoutId < 0 || item.workoutId > 4) continue;
    const record = {
      id: item.id,
      date: item.date,
      workoutId: item.workoutId,
      title:
        typeof item.title === 'string' && item.title.trim()
          ? item.title.trim().slice(0, 100)
          : 'Workout completed',
    };
    // Old records have no reliable plan identity. Keep their history without marking a new plan complete.
    if (typeof item.planId === 'string' && item.planId.length > 0 && item.planId.length <= 200)
      record.planId = item.planId;
    if (typeof item.completedAt === 'string' && Number.isFinite(Date.parse(item.completedAt)))
      record.completedAt = item.completedAt;
    if (isObject(item.snapshot) && Array.isArray(item.snapshot.exercises)) {
      record.snapshot = {
        goal: choices.goal.includes(item.snapshot.goal) ? item.snapshot.goal : '',
        equipment: choices.equipment.includes(item.snapshot.equipment)
          ? item.snapshot.equipment
          : '',
        exercises: item.snapshot.exercises
          .filter(
            (e) => isObject(e) && typeof e.name === 'string' && typeof e.prescription === 'string',
          )
          .map((e) => ({ name: e.name.slice(0, 100), prescription: e.prescription.slice(0, 100) })),
      };
    }
    unique.set(record.id, record);
  }
  return [...unique.values()];
}
