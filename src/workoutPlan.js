export const defaultProfile = {
  name: 'Alex',
  height: 175,
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
const exercise = (name, prescription, focus) => ({ name, prescription, focus });
export function buildPlan(profile) {
  const home = profile.equipment === 'Bodyweight only';
  const sets = profile.experience === 'Beginner' ? 2 : profile.experience === 'Experienced' ? 4 : 3;
  const upper = [
    exercise(
      home ? 'Push-up' : 'Dumbbell bench press',
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
    exercise('Step-up', '2 sets · 10 reps / side', 'Legs & conditioning'),
    exercise('Gentle full-body stretch', '5 minutes', 'Mobility & recovery'),
  ];
  const full = [lower[0], upper[0], upper[1], lower[1]];
  const mobility = [cardio[3], cardio[1], lower[1], upper[3]];
  const strengthDays = [
    ['Upper body & core', upper, 'Strength'],
    ['Lower body strength', lower, 'Strength'],
    ['Full-body strength', full, 'Strength'],
    ['Upper body & core', upper, 'Strength'],
    ['Strength & mobility', mobility, 'Mobility'],
  ];
  const balancedDays = [
    ['Full-body strength', full, 'Strength'],
    ['Cardio & core', cardio, 'Cardio'],
    ['Lower body strength', lower, 'Strength'],
    ['Easy conditioning', cardio, 'Cardio'],
    ['Strength & mobility', mobility, 'Mobility'],
  ];
  const enduranceDays = [
    ['Cardio & core', cardio, 'Cardio'],
    ['Full-body strength', full, 'Strength'],
    ['Steady cardio & mobility', cardio, 'Cardio'],
    ['Strength & mobility', mobility, 'Mobility'],
    ['Easy conditioning', cardio, 'Cardio'],
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
export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map((record) =>
      typeof record === 'string'
        ? {
            id: record,
            date: record.slice(0, 10),
            workoutId: Number(record.slice(11)),
            title: 'Workout completed',
          }
        : record,
    )
    .filter((record) => record && typeof record.date === 'string' && typeof record.id === 'string');
}
