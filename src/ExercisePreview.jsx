import React, { useState } from 'react';
import { Play } from 'lucide-react';
import mediaCatalog from './realExerciseMedia.json';
import { guideSlug } from './exerciseData';
import { publicAsset } from './assets';
export default function ExercisePreview({ name, onClick, large = false }) {
  const [failed, setFailed] = useState(false);
  const media = mediaCatalog[guideSlug(name)];
  return (
    <button
      className={`exercise-preview ${large ? 'large' : ''} ${!media || failed ? 'no-photo' : ''}`}
      onClick={onClick}
      aria-label={`Watch how to do ${name}`}
    >
      {media && !failed && (
        <img
          src={publicAsset(`exercises/${guideSlug(name)}-start.jpg`)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <span className="preview-play">
        <Play size={large ? 24 : 14} fill="currentColor" />
      </span>
      {large && <span className="preview-label">Watch the demonstration</span>}
    </button>
  );
}
