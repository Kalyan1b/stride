import React, { useEffect, useRef, useState } from 'react';
import { toCentimeters, toFeetAndInches } from './height';

export default function HeightInput({ height, unit = 'cm', onChange, onUnitChange }) {
  const [imperial, setImperial] = useState(() => toFeetAndInches(height));
  const feetInput = useRef(null);
  const inRange = height !== '' && Number(height) >= 100 && Number(height) <= 250;
  useEffect(() => {
    feetInput.current?.setCustomValidity(
      inRange || height === ''
        ? ''
        : 'Enter a height between 100 and 250 cm (about 3 ft 3.38 in to 8 ft 2.42 in).',
    );
  }, [height, unit, inRange]);
  function changeUnit(next) {
    if (next === unit) return;
    if (next === 'ft') setImperial(toFeetAndInches(height));
    onUnitChange(next);
  }
  function changePart(part, value) {
    const next = { ...imperial, [part]: value };
    setImperial(next);
    onChange(toCentimeters(next.feet, next.inches));
  }
  return (
    <fieldset className="height-field">
      <legend>Height</legend>
      <div className="height-unit-options" role="group" aria-label="Height unit">
        <button type="button" aria-pressed={unit === 'cm'} onClick={() => changeUnit('cm')}>
          cm
        </button>
        <button type="button" aria-pressed={unit === 'ft'} onClick={() => changeUnit('ft')}>
          ft / in
        </button>
      </div>
      {unit === 'ft' ? (
        <div className="height-parts">
          <label>
            Feet
            <input
              ref={feetInput}
              type="number"
              inputMode="numeric"
              min="0"
              max="8"
              step="1"
              required
              value={imperial.feet}
              onChange={(event) => changePart('feet', event.target.value)}
              aria-describedby="height-hint"
            />
          </label>
          <label>
            Inches
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="11.99"
              step="0.01"
              required
              value={imperial.inches}
              onChange={(event) => changePart('inches', event.target.value)}
              aria-describedby="height-hint"
            />
          </label>
        </div>
      ) : (
        <label>
          Centimeters
          <input
            type="number"
            inputMode="decimal"
            min="100"
            max="250"
            step="any"
            required
            value={height}
            onChange={(event) => onChange(event.target.value)}
            aria-describedby="height-hint"
          />
        </label>
      )}
      <p id="height-hint" className="form-hint" aria-live="polite">
        {unit === 'ft' && inRange
          ? `${height} cm equivalent.`
          : 'Enter a height between 100 and 250 cm.'}
      </p>
    </fieldset>
  );
}
