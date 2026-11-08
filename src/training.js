// Shared exercise structure, logging rules, and conservative progression suggestions.
export const movement = {
  'Bodyweight squat': ['squat', [], 'Quads & glutes'],
  'Goblet squat': ['squat', [], 'Quads & glutes'],
  'Reverse lunge': ['squat', ['singleLeg'], 'Legs & balance'],
  'Split squat': ['squat', ['singleLeg'], 'Quads & glutes'],
  'Step-up': ['squat', ['singleLeg'], 'Legs & conditioning'],
  'Glute bridge': ['hinge', ['floor'], 'Glutes & hamstrings'],
  'Dumbbell Romanian deadlift': ['hinge', [], 'Hamstrings & glutes'],
  'Push-up': ['push', ['floor'], 'Chest & shoulders'],
  'Dumbbell bench press': ['push', [], 'Chest & shoulders'],
  'Prone Y-T raise': ['pull', ['floor', 'overhead'], 'Upper back & shoulder control'],
  'Dumbbell bent-over row': ['pull', [], 'Back'],
  'Seated cable row': ['pull', [], 'Back'],
  'Dumbbell shoulder press': ['shoulder', ['overhead'], 'Shoulders'],
  'Pike push-up': ['shoulder', ['floor', 'overhead'], 'Shoulders'],
  'Dumbbell lateral raise': ['shoulder', [], 'Side shoulders'],
  'Dumbbell rear-delt fly': ['shoulder', [], 'Rear shoulders'],
  'Bird dog': ['core', ['floor', 'kneeling'], 'Core & balance'],
  'Dead bug': ['core', ['floor'], 'Core & stability'],
  Plank: ['core', ['floor'], 'Core & stability'],
  'Standing calf raise': ['calf', [], 'Calves'],
  'Brisk walk or cycle': ['cardio', [], 'Conversational pace'],
  'Gentle full-body stretch': ['mobility', ['overhead'], 'Comfortable mobility'],
};
export const limitationLabels = {
  floor: 'Avoid floor exercises',
  overhead: 'Avoid overhead movements',
  kneeling: 'Avoid kneeling',
  singleLeg: 'Avoid single-leg exercises',
};
export function exerciseAllowed(name, profile) {
  return (
    movement[name] &&
    !profile.excludedExercises?.includes(name) &&
    !movement[name][1].some((tag) => profile.limitations?.includes(tag))
  );
}
export function structureExercise(item) {
  const unit = item.prescription.includes('minutes')
    ? 'min'
    : /sec/.test(item.prescription)
      ? 'sec'
      : 'reps';
  const counts = item.prescription.match(/(\d+)(?:–(\d+))?\s*(?:reps|sec|minutes)/);
  const sets = Number(item.prescription.match(/^(\d+)\s*(?:sets|holds)/)?.[1] || 1);
  return {
    ...item,
    unit,
    sets,
    min: Number(counts?.[1] || 8),
    max: Number(counts?.[2] || counts?.[1] || 12),
    perSide:
      item.prescription.includes('/ side') ||
      ['Bird dog', 'Step-up', 'Dead bug', 'Reverse lunge', 'Split squat'].includes(item.name),
    restSeconds:
      unit === 'min'
        ? 30
        : ['squat', 'hinge', 'push', 'pull'].includes(movement[item.name]?.[0])
          ? 90
          : 60,
  };
}
export function prescriptionFor(item) {
  return item.unit === 'min'
    ? `${item.min} minutes`
    : `${item.sets} ${item.unit === 'sec' ? 'holds' : 'sets'} · ${item.min}${item.max !== item.min ? `–${item.max}` : ''} ${item.unit}${item.perSide ? ' / side' : ''}`;
}
export function estimateMinutes(exercises) {
  const seconds = exercises.reduce((sum, item) => {
    const work =
      item.unit === 'min'
        ? item.min * 60
        : item.unit === 'sec'
          ? item.max
          : item.max * 3 * (item.perSide ? 2 : 1);
    return sum + item.sets * work + Math.max(0, item.sets - 1) * item.restSeconds + 30;
  }, 300);
  return Math.ceil(seconds / 60);
}
export function fitSession(exercises, minutes) {
  const result = exercises.map((item) => ({ ...item }));
  while (estimateMinutes(result) > minutes) {
    const longest = [...result].sort((a, b) => b.sets - a.sets).find((item) => item.sets > 1);
    if (longest) longest.sets--;
    else {
      const timed = result.find((item) => item.unit === 'min' && item.min > 2);
      if (timed) {
        timed.min--;
        timed.max = timed.min;
      } else break;
    }
  }
  return result.map((item) => ({ ...item, prescription: prescriptionFor(item) }));
}
export const emptySet = () => ({ value: '', weight: '', done: false });
export function validSet(row, item) {
  const value = Number(row?.value),
    weight = Number(row?.weight);
  return (
    row?.value !== '' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= (item.unit === 'reps' ? 200 : item.unit === 'sec' ? 3600 : 120) &&
    (item.unit !== 'reps' || Number.isInteger(value)) &&
    (row.weight === '' || (Number.isFinite(weight) && weight >= 0 && weight <= 500))
  );
}
export function normalizeLog(input, item) {
  return {
    effort: ['easy', 'right', 'hard'].includes(input?.effort) ? input.effort : '',
    sets: Array.from({ length: item.sets }, (_, i) => {
      const row = input?.sets?.[i] || emptySet();
      const clean = {
        value:
          typeof row.value === 'number' || typeof row.value === 'string'
            ? String(row.value).slice(0, 12)
            : '',
        weight:
          typeof row.weight === 'number' || typeof row.weight === 'string'
            ? String(row.weight).slice(0, 12)
            : '',
        done: false,
      };
      clean.done = row.done === true && validSet(clean, item);
      return clean;
    }),
  };
}
export function latestPerformance(history, name) {
  return [...history]
    .reverse()
    .flatMap((record) =>
      (record.performance || [])
        .filter((entry) => entry.name === name)
        .map((entry) => ({ ...entry, date: record.date })),
    )
    .find((entry) => entry.sets?.length || entry.skipped);
}
export function progression(item, previous) {
  if (!previous)
    return 'Start with an easy practice set. Choose a load or variation you can control, leaving about 2 good reps in reserve.';
  if (previous.skipped === 'Pain or discomfort')
    return 'You stopped this movement because of discomfort last time. Don’t push through pain; review whether it belongs in your plan before trying it again.';
  if (
    previous.date &&
    (Date.now() - new Date(`${previous.date}T12:00:00`).getTime()) / 86400000 > 14
  )
    return 'It has been more than two weeks since this movement was logged. Start easier than your previous session and rebuild gradually.';
  if (previous.effort === 'hard')
    return 'Last time felt too hard. Use less load or an easier variation today; stop if a movement hurts.';
  if (previous.unit !== item.unit || previous.perSide !== item.perSide)
    return 'The target format changed. Use today’s prescription and establish a new baseline.';
  if (
    previous.effort === 'easy' &&
    previous.sets.length >= item.sets &&
    previous.sets.every((row) => Number(row.value) >= item.max)
  ) {
    if (item.unit === 'reps' && previous.sets.every((row) => Number(row.weight) > 0))
      return 'You reached the top of the range with easy effort. Consider the smallest available weight increase and return to the lower end of the rep range.';
    return item.unit === 'reps'
      ? 'You reached the top of the range with easy effort. Consider a harder controlled variation, or add resistance when available.'
      : 'You met the time target comfortably. Repeat it or increase time slightly when ready; stay within a comfortable effort.';
  }
  return 'Repeat the same difficulty and build toward the top of today’s range with controlled form. Increase only when all sets feel manageable.';
}
export function performanceSummary(entry) {
  return entry.sets
    .map(
      (row) =>
        `${row.value} ${entry.unit}${entry.perSide ? '/side' : ''}${row.weight !== '' ? ` @ ${row.weight} kg` : ''}`,
    )
    .join(' · ');
}
