// Keep centimeters as the canonical value used for BMI and existing profiles.
export function toFeetAndInches(centimeters) {
  if (centimeters === '' || !Number.isFinite(Number(centimeters))) return { feet: '', inches: '' };
  const total = Math.round((Number(centimeters) / 2.54) * 100) / 100;
  const feet = Math.floor(total / 12);
  return { feet, inches: Number((total - feet * 12).toFixed(2)) };
}
export function toCentimeters(feet, inches) {
  if (feet === '' || inches === '') return '';
  return Number(((Number(feet) * 12 + Number(inches)) * 2.54).toFixed(2));
}
export function formatHeight(profile) {
  if (profile.heightUnit !== 'ft') return `${profile.height} cm`;
  const { feet, inches } = toFeetAndInches(profile.height);
  return `${feet} ft ${inches} in`;
}
