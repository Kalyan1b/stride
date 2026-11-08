import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, ExternalLink, Video, Image as ImageIcon } from 'lucide-react';
import { exerciseGuides as entries, guideSlug } from './exerciseData';
import mediaCatalog from './realExerciseMedia.json';
import { exerciseCoaching } from './exerciseCoaching';
import { publicAsset } from './assets';

export const tutorials = {
  'Dumbbell Romanian deadlift': [
    { id: 'KrRtk8KbJik', title: 'Dumbbell Romanian Deadlift', creator: 'Peak Human Performance' },
  ],
  'Split squat': [{ id: '4bNQITw0VdY', title: 'How to Perform Split Squats', creator: 'E3 Rehab' }],
  'Standing calf raise': [
    { id: 'IphGZ8OlfYg', title: 'Single Leg Calf Raise (progression)', creator: 'PureGym' },
  ],
  'Dumbbell rear-delt fly': [
    { id: 'nlkF7_2O_Lw', title: 'How to Do a Rear Delt Fly', creator: 'PureGym' },
  ],
  'Bird dog': [{ id: 'egKWoMZ6cXM', title: 'Bird Dog', creator: 'E3 Rehab Exercise Library' }],
  'Pike push-up': [
    { id: 'lIZ_C4VJnmc', title: 'Pike Pushup Tutorial', creator: 'Chris Calisthenics' },
  ],
  'Reverse lunge': [{ id: 'xrPteyQLGAo', title: 'How To Reverse Lunge', creator: 'PureGym' }],
  'Prone Y-T raise': [
    { id: 'w1AWGKubE5U', title: 'Prone Y Raise', creator: 'Performance Course' },
    { id: '3GJoiYUYwr0', title: 'Prone T Raise', creator: 'Performance Course' },
  ],
};
export default function ExerciseGuide({ name, onClose }) {
  const slug = guideSlug(name),
    media = mediaCatalog[slug],
    videos = tutorials[name];
  const [playing, setPlaying] = useState(
    () => Boolean(media) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [position, setPosition] = useState('start'),
    [failed, setFailed] = useState(false),
    [videoIndex, setVideoIndex] = useState(0);
  const ref = useRef(null);
  const [, , , originalSteps, tip] = entries[name];
  const steps = [...originalSteps];
  if (name === 'Dead bug')
    steps[1] =
      'Slowly extend one leg while keeping your back steady. The photos show the easier leg-only variation; add the opposite arm reach when comfortable.';
  if (name === 'Plank')
    steps[0] =
      'Place forearms on the floor with elbows beneath shoulders, then extend your legs behind you.';
  if (name === 'Dumbbell shoulder press')
    steps[0] =
      'Stand tall with dumbbells near shoulder height. The video shows an optional seated variation if you have a supported bench.';
  if (name === 'Standing calf raise')
    steps[0] =
      'Stand on level ground with feet hip-width apart. Use a wall or stable chair lightly for balance, as shown in the GIF.';
  if (name === 'Prone Y-T raise')
    steps.push('One rep is one controlled Y lift followed by one T lift.');
  if (name === 'Goblet squat')
    steps[0] =
      'Hold one dumbbell or kettlebell close to your chest, with feet about shoulder width. The demonstration uses a kettlebell.';
  const video = videos?.[videoIndex];
  const source = media?.source || `https://www.youtube.com/watch?v=${video?.id}`;
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      className="guide-dialog real-guide"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="guide-title"
    >
      <div className="guide-inner">
        <button className="close" aria-label="Close exercise guide" onClick={onClose}>
          <X />
        </button>
        <span className="eyebrow">WATCH. LEARN. FIND YOUR FORM.</span>
        <h2 id="guide-title">{name}</h2>
        <div className="demo-type">
          {media?.kind === 'footage' ? (
            <Video size={14} />
          ) : media ? (
            <ImageIcon size={14} />
          ) : (
            <Video size={14} />
          )}{' '}
          {media?.kind === 'footage'
            ? 'Real-person GIF'
            : media
              ? 'Real-person pose sequence'
              : 'Instructor video'}
          <span>{media?.view || video?.creator}</span>
        </div>
        <div className="real-demo-stage">
          {failed ? (
            <div className="media-unavailable" role="status">
              <p>The demonstration couldn’t load.</p>
              <button className="outline" onClick={() => setFailed(false)}>
                Try again
              </button>
              <a href={source} target="_blank" rel="noreferrer">
                View the original demonstration <ExternalLink size={13} />
              </a>
            </div>
          ) : media ? (
            <img
              key={`${playing}-${position}`}
              src={publicAsset(`exercises/${slug}${playing ? '.gif' : `-${position}.jpg`}`)}
              alt={`${name}: ${playing ? 'looping real-person demonstration' : `${position} frame`}`}
              onError={() => setFailed(true)}
            />
          ) : playing ? (
            <iframe
              key={video.id}
              src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
              title={`${name} demonstration by ${video.creator}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button className="video-preview" onClick={() => setPlaying(true)}>
              <span className="video-play-icon">
                <Play size={28} />
              </span>
              <b>Watch {video.title}</b>
              <span>A real-person demonstration by {video.creator}</span>
            </button>
          )}
        </div>
        <div className="demo-controls">
          <button
            className="outline"
            onClick={() => {
              setPlaying(!playing);
              setFailed(false);
            }}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Stop' : 'Play'}{' '}
            {media ? 'GIF' : 'video'}
          </button>
          {media && (
            <>
              <button
                className="text-button"
                aria-pressed={!playing && position === 'start'}
                onClick={() => {
                  setPlaying(false);
                  setPosition('start');
                  setFailed(false);
                }}
              >
                {media.positions?.[0] ||
                  (media.kind === 'poses' ? 'Start position' : 'Freeze first frame')}
              </button>
              <button
                className="text-button"
                aria-pressed={!playing && position === 'end'}
                onClick={() => {
                  setPlaying(false);
                  setPosition('end');
                  setFailed(false);
                }}
              >
                {media.positions?.[1] ||
                  (media.kind === 'poses'
                    ? 'End position'
                    : name === 'Reverse lunge'
                      ? 'Lowered position'
                      : 'Freeze second position')}
              </button>
            </>
          )}
          {media &&
            videos?.map((tutorial, i) => (
              <a
                key={tutorial.id}
                className="text-button"
                href={`https://www.youtube.com/watch?v=${tutorial.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {videos.length > 1
                  ? `Watch ${i === 0 ? 'Y' : 'T'} tutorial`
                  : 'Watch full tutorial'}{' '}
                <ExternalLink size={13} />
              </a>
            ))}
          {!media &&
            videos?.length > 1 &&
            videos.map((tutorial, i) => (
              <button
                key={tutorial.id}
                className="text-button"
                aria-pressed={videoIndex === i}
                onClick={() => {
                  setVideoIndex(i);
                  setPlaying(true);
                }}
              >
                {i === 0 ? 'Y raise' : 'T raise'}
              </button>
            ))}
        </div>
        {media?.kind === 'poses' && (
          <p className="media-caption">
            Two real photographs alternate to show the positions. Read the steps below for the
            movement between them.
          </p>
        )}
        {name === 'Plank' && (
          <p className="media-caption">
            Hold this position with steady breathing; a plank is a static exercise.
          </p>
        )}
        {media?.disclaimer && <p className="media-caption">{media.disclaimer}</p>}
        <h3>How to do it</h3>
        <ol className="guide-steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="guide-tip">
          <b>Form tip</b>
          {tip}
        </p>
        <div className="training-advice">
          <b>Make it easier</b>
          <p>{exerciseCoaching[name]?.[0]}</p>
          <b>Common mistake to avoid</b>
          <p>{exerciseCoaching[name]?.[1]}</p>
          <p>Stop if the movement hurts. An easier variation is not a treatment for an injury.</p>
        </div>
        <div className="media-credit">
          <a href={source} target="_blank" rel="noreferrer">
            {media?.sourceTitle && `${media.sourceTitle} · `}
            {media?.credit || video?.creator} · View original <ExternalLink size={12} />
          </a>
          {media && (
            <span>
              {media.licenseUrl ? (
                <a href={media.licenseUrl} target="_blank" rel="noreferrer">
                  {media.license}
                </a>
              ) : (
                media.license
              )}{' '}
              ·{' '}
              {media.kind === 'poses'
                ? 'Resized photos combined into a GIF'
                : 'Excerpt resized and converted to GIF'}
            </span>
          )}
        </div>
      </div>
    </dialog>
  );
}
