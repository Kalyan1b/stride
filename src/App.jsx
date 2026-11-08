import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  House,
  Leaf,
  LockKeyhole,
  Play,
  Settings2,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import ExerciseGuide from './ExerciseGuide';
import { publicAsset } from './assets';
import ExercisePreview from './ExercisePreview';
import ProfileWizard from './ProfileWizard';
import WorkoutSession from './WorkoutSession';
import { buildPlan, weekdays, localDate, weekStart, saveStored } from './workoutPlan';
import {
  STORAGE_KEY,
  loadAppState,
  updateProfile,
  updateDraft,
  completeWorkout,
  completedThisWeek,
  emptyDraft,
} from './appState';
const navigation = [
  { name: 'Home', Icon: House },
  { name: 'My plan', Icon: CalendarDays },
  { name: 'Progress', Icon: ChartNoAxesCombined },
];
export default function App() {
  const [boot] = useState(loadAppState);
  const [state, setState] = useState(boot.state);
  const { profile, personalized, history, active } = state;
  const [tab, setTab] = useState('Home'),
    [editing, setEditing] = useState(false),
    [guide, setGuide] = useState(null),
    [session, setSession] = useState(false),
    [notice, setNotice] = useState(boot.notice),
    [celebration, setCelebration] = useState(null),
    [storageAvailable, setStorageAvailable] = useState(true);
  const plan = buildPlan(profile),
    workout = plan[active] || plan[0];
  const draft = state.drafts[active] || emptyDraft(),
    done = draft.done;
  const hasProgress = draft.started || done.length > 0;
  useEffect(() => {
    setStorageAvailable(saveStored(STORAGE_KEY, state));
  }, [state]);
  const today = localDate(),
    startOfWeek = weekStart(),
    weeklyHistory = history.filter((record) => record.date >= startOfWeek && record.date <= today);
  const weeklyCount = weeklyHistory.length,
    percent = Math.min(100, (weeklyCount / plan.length) * 100);
  const bmi = Number(profile.weight) / (Number(profile.height) / 100) ** 2;
  const category =
    bmi < 18.5
      ? 'Below adult reference range'
      : bmi < 25
        ? 'Within adult reference range'
        : 'Above adult reference range';
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function changeTab(next) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function saveProfile(next) {
    setState((prev) => updateProfile(prev, next));
    setEditing(false);
    setTab('Home');
    setNotice('Your plan is ready. Make it a good session.');
  }
  function updateSession(patch) {
    setState((prev) => updateDraft(prev, prev.active, patch));
  }
  function finish() {
    if (done.length !== workout.exercises.length) return;
    setState((prev) => completeWorkout(prev));
    setSession(false);
    setCelebration(workout.title);
  }
  function selectWorkout(index) {
    setState((prev) => ({ ...prev, active: index }));
  }
  const openSetup = () => setEditing(true);
  const startWorkout = () => setSession(true);
  const weeklyDone = (index) => completedThisWeek(state, index);
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeTab('Home');
          }}
          aria-label="Stride home"
        >
          <span className="brand-symbol">
            s<span>↗</span>
          </span>
          stride<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-label">YOUR EVERYDAY, STRONGER.</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, Icon }) => (
            <button
              key={name}
              className={`nav ${tab === name ? 'active' : ''}`}
              onClick={() => changeTab(name)}
              aria-current={tab === name ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{name}</span>
              {tab === name && <ArrowUpRight size={16} className="nav-arrow" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-manifesto">
            <span className="manifesto-star">✳</span>
            <p>
              You don’t have to
              <br />
              go all out.
              <br />
              <b>Just show up.</b>
            </p>
            <span>PROGRESS IS PERSONAL.</span>
          </div>
          <button className="profile-button" onClick={openSetup}>
            <span className="avatar">
              {personalized ? profile.name.slice(0, 1).toUpperCase() : 'Y'}
            </span>
            <span>
              <b>{personalized ? profile.name : 'Your space'}</b>
              <small>{personalized ? 'Edit your profile' : 'Make it yours'}</small>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb">
            <span>Your space</span>
            <ChevronRight size={14} />
            <b>{tab}</b>
          </div>
          <div className="topbar-note">
            <span className="status-dot" /> A little better, every day.
          </div>
          <button className="mobile-profile" onClick={openSetup} aria-label="Edit your profile">
            <Settings2 size={20} />
          </button>
        </header>
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {tab === 'Home'
                ? 'GOOD HABITS START HERE'
                : tab === 'My plan'
                  ? 'A LITTLE STRUCTURE. MORE CONFIDENCE.'
                  : 'SMALL WINS. REAL MOMENTUM.'}
            </span>
            <h1>
              {tab === 'Home' ? (
                personalized ? (
                  <>
                    Hey {profile.name},<br className="mobile-break" /> let’s move
                    <span className="orange">.</span>
                  </>
                ) : (
                  <>
                    Find your rhythm<span className="orange">.</span>
                  </>
                )
              ) : tab === 'My plan' ? (
                <>
                  Your week, your pace<span className="orange">.</span>
                </>
              ) : (
                <>
                  Look how far you’ve come<span className="orange">.</span>
                </>
              )}
            </h1>
            <p>
              {tab === 'Home'
                ? 'A doable plan. A little guidance. A stronger you.'
                : tab === 'My plan'
                  ? 'Pick a session to see your exercises. Rest days count, too.'
                  : 'Every time you show up, you’re building something.'}
            </p>
          </div>
          <button className="outline profile-edit" onClick={openSetup}>
            <Settings2 size={16} />
            {personalized ? 'Adjust my plan' : 'Personalize my plan'}
          </button>
        </div>
        {!personalized && tab !== 'Progress' && (
          <div className="welcome-banner">
            <span className="welcome-icon">
              <Sparkles size={21} />
            </span>
            <div>
              <b>Your next chapter starts with you.</b>
              <p>This is a sample plan. Make it yours in 3 quick steps.</p>
            </div>
            <button onClick={openSetup}>
              Let’s build your plan <ArrowRight size={17} />
            </button>
          </div>
        )}
        {!storageAvailable && (
          <div className="storage-warning" role="alert">
            Your browser couldn’t save these changes. They are available for this visit only; keep
            this page open to avoid losing your workout.
          </div>
        )}
        {tab === 'Home' && (
          <>
            <div className="dashboard-top">
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <span />
                    {personalized ? 'MADE FOR YOUR NEXT MOVE' : 'MEET YOUR MOVEMENT PLAN'}
                  </span>
                  <h2>
                    Less guessing.
                    <br />
                    More <span>going.</span>
                  </h2>
                  <p>
                    {personalized
                      ? `Work toward your goal to ${profile.goal.toLowerCase()} with a routine that fits your life.`
                      : 'Find the confidence to begin, with simple workouts and real-person demonstrations.'}
                  </p>
                  <button className="hero-button" onClick={personalized ? startWorkout : openSetup}>
                    {personalized
                      ? hasProgress
                        ? 'Resume workout'
                        : 'Let’s get moving'
                      : 'Find my plan'}
                    <ArrowUpRight size={20} />
                  </button>
                  <div className="hero-meta">
                    <span>
                      <Timer size={14} />
                      {workout.minutes} min
                    </span>
                    <span>
                      <Dumbbell size={14} />
                      {profile.experience}
                    </span>
                  </div>
                </div>
                <div className="hero-photo">
                  <img
                    src={publicAsset('exercises/bodyweight-squat-start.jpg')}
                    alt="A person preparing for a strength workout in a gym"
                  />
                  <div className="hero-photo-shade" />
                  <div className="hero-photo-sticker">
                    <span>01</span>
                    <small>
                      SHOW UP
                      <br />
                      FOR YOU.
                    </small>
                    <ArrowUpRight size={29} />
                  </div>
                  <span className="hero-orbit" aria-hidden="true" />
                </div>
              </section>
              <section className="weekly-card">
                <div className="card-topline">
                  <span className="eyebrow">YOUR WEEK SO FAR</span>
                  <span className="tiny-icon">
                    <Flame size={17} />
                  </span>
                </div>
                <div
                  className="progress-ring"
                  style={{ '--progress': `${percent}%` }}
                  role="img"
                  aria-label={`${weeklyCount} of ${plan.length} weekly workouts completed`}
                >
                  <div>
                    <strong>
                      {weeklyCount}
                      <span>/{plan.length}</span>
                    </strong>
                    <small>workouts done</small>
                  </div>
                </div>
                <h3>
                  {weeklyCount >= plan.length
                    ? 'You showed up. Again.'
                    : weeklyCount
                      ? 'Keep your good thing going.'
                      : 'Every week is a fresh start.'}
                </h3>
                <p>
                  {weeklyCount >= plan.length
                    ? 'Your weekly goal is complete. Make time to recover.'
                    : 'One session at a time. You’re on your own timeline.'}
                </p>
                <button className="text-button" onClick={() => changeTab('Progress')}>
                  See my progress <ArrowRight size={16} />
                </button>
              </section>
            </div>
            <div className="quick-facts">
              <div>
                <span className="fact-icon">
                  <Target size={18} />
                </span>
                <span>
                  <small>YOUR FOCUS</small>
                  <b>{profile.goal}</b>
                </span>
              </div>
              <div>
                <span className="fact-icon">
                  <CalendarDays size={18} />
                </span>
                <span>
                  <small>YOUR RHYTHM</small>
                  <b>{plan.length} days a week</b>
                </span>
              </div>
              <div>
                <span className="fact-icon">
                  <Dumbbell size={18} />
                </span>
                <span>
                  <small>YOUR SETUP</small>
                  <b>
                    {profile.equipment === 'Bodyweight only'
                      ? profile.hasStep
                        ? 'Bodyweight + step'
                        : 'No equipment'
                      : profile.hasBench && profile.equipment === 'Dumbbells'
                        ? 'Dumbbells + bench'
                        : profile.equipment}
                  </b>
                </span>
              </div>
              <button onClick={openSetup} aria-label="Change your workout preferences">
                <Settings2 size={17} />
                <span>Make it yours</span>
              </button>
            </div>
          </>
        )}
        {tab !== 'Progress' ? (
          <div className="plan-layout">
            <div className="plan-main">
              <section className="week-section">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">A ROUTINE YOU CAN COME BACK TO</span>
                    <h2>{tab === 'My plan' ? 'Your weekly plan' : 'Your weekly rhythm'}</h2>
                  </div>
                  <span className="section-chip">{plan.length} workouts · flexible days</span>
                </div>
                <div className="week-strip">
                  {weekdays.map((day, dayIndex) => {
                    const index = plan.findIndex((item) => item.day === dayIndex),
                      item = plan[index];
                    return item ? (
                      <button
                        key={day}
                        className={`week-day workout-day ${active === index ? 'selected' : ''} ${weeklyDone(index) ? 'completed' : ''}`}
                        aria-pressed={active === index}
                        onClick={() => selectWorkout(index)}
                      >
                        <span>{day.slice(0, 3)}</span>
                        <span className="day-icon">
                          {weeklyDone(index) ? (
                            <Check size={20} />
                          ) : item.type === 'Cardio' ? (
                            <Heart size={20} />
                          ) : item.type === 'Mobility' ? (
                            <Leaf size={20} />
                          ) : (
                            <Dumbbell size={20} />
                          )}
                        </span>
                        <b>{item.type}</b>
                        <small>{item.minutes} min</small>
                        {active === index && <span className="selected-dot" />}
                      </button>
                    ) : (
                      <div key={day} className="week-day rest-day">
                        <span>{day.slice(0, 3)}</span>
                        <span className="day-icon">
                          <Leaf size={18} />
                        </span>
                        <b>Rest</b>
                        <small>Recharge</small>
                      </div>
                    );
                  })}
                </div>
                <div className="week-tip">
                  <Leaf size={14} />
                  <span>
                    Different session focuses, repeatable progress. Keep these movements for 4–6
                    weeks and leave a recovery day between hard sessions for the same muscles.
                  </span>
                </div>
              </section>
              <section className="workout-card" aria-labelledby="selected-workout-title">
                <div className="workout-card-header">
                  <div>
                    <div className="workout-day-label">
                      <span className="orange-dot" />
                      {weekdays[workout.day].toUpperCase()} / SESSION {active + 1}
                    </div>
                    <h2 id="selected-workout-title">{workout.title}</h2>
                    <div className="workout-meta">
                      <span>
                        <Timer size={14} />
                        {workout.minutes} min
                      </span>
                      <span>
                        <Dumbbell size={14} />
                        {workout.exercises.length} exercises
                      </span>
                      <span className="level-tag">{profile.experience}</span>
                    </div>
                  </div>
                  <button className="primary" onClick={startWorkout}>
                    {hasProgress ? 'Resume session' : 'Start session'}
                    <Play size={15} fill="currentColor" />
                  </button>
                </div>
                <div className="warmup-note">
                  <Flame size={17} />
                  <span>
                    <b>First, warm up.</b> Take 5 minutes to walk and rehearse the movements with
                    easy reps. Choose a difficulty that leaves about 2 good reps in reserve;
                    increase gradually when all sets reach the top of the rep range.
                  </span>
                </div>
                <div className="exercise-list">
                  {workout.exercises.map((item, i) => (
                    <div className="exercise-row" key={item.name}>
                      <span className={`exercise-number ${done.includes(i) ? 'is-done' : ''}`}>
                        {done.includes(i) ? <Check size={15} /> : String(i + 1).padStart(2, '0')}
                      </span>
                      <ExercisePreview
                        key={item.name}
                        name={item.name}
                        onClick={() => setGuide(item.name)}
                      />
                      <div className="exercise-info">
                        <h3>{item.name}</h3>
                        <p>{item.focus}</p>
                        <span className="mobile-prescription">{item.prescription}</span>
                      </div>
                      <span className="exercise-prescription">{item.prescription}</span>
                      <button
                        className="demo-button"
                        onClick={() => setGuide(item.name)}
                        aria-label={`Watch how to do ${item.name}`}
                      >
                        <Play size={13} />
                        <span>Watch demo</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="workout-card-footer">
                  <span>
                    <Check size={15} /> Step-by-step guidance included
                  </span>
                  <span>Go at your own pace.</span>
                </div>
              </section>
            </div>
            <div className="plan-side">
              <section className="body-card">
                <div className="section-title">
                  <h2>Your starting point</h2>
                  <span className="tiny-icon">
                    <Activity size={17} />
                  </span>
                </div>
                <p>A reference for your journey.</p>
                <div className="body-values">
                  <div>
                    <span>Height</span>
                    <b>
                      {profile.height}
                      <small> cm</small>
                    </b>
                  </div>
                  <div>
                    <span>Weight</span>
                    <b>
                      {profile.weight}
                      <small> kg</small>
                    </b>
                  </div>
                </div>
                <div className="bmi-result">
                  <span>
                    Body mass index <b>{bmi.toFixed(1)}</b>
                  </span>
                  <div className="bmi-scale">
                    <i style={{ left: `${Math.max(2, Math.min(98, ((bmi - 14) / 26) * 100))}%` }} />
                  </div>
                  <small>{category}</small>
                </div>
                <p className="bmi-explanation">
                  BMI doesn’t measure muscle or fitness. Use it as one reference, alongside how you
                  feel.
                </p>
                <button className="outline wide" onClick={openSetup}>
                  Update my details <ArrowRight size={16} />
                </button>
              </section>
              <section className="reminder-card">
                <span className="reminder-spark" aria-hidden="true">
                  ✳
                </span>
                <span className="eyebrow">A FRIENDLY REMINDER</span>
                <h3>
                  Your only
                  <br />
                  competition?
                  <br />
                  <em>Yesterday.</em>
                </h3>
                <p>
                  More energy. One extra rep. A better night’s sleep. There’s more than one way to
                  make progress.
                </p>
                <span className="reminder-bottom">
                  TAKE THE SMALL WIN. <Heart size={15} />
                </span>
              </section>
              <p className="privacy-note">
                <LockKeyhole size={14} /> Your profile stays in this browser.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="progress-grid">
              <section className="progress-feature">
                <span className="eyebrow">EVERY SESSION COUNTS</span>
                <Trophy size={33} />
                <strong>{history.length.toString().padStart(2, '0')}</strong>
                <h2>workouts completed</h2>
                <p>
                  {history.length
                    ? 'That’s time you made for yourself. Keep it going.'
                    : 'Your first little win is waiting. Let’s make it happen.'}
                </p>
                <button className="primary" onClick={() => changeTab('My plan')}>
                  {history.length ? 'Plan my next session' : 'Find my first workout'}
                  <ArrowRight size={17} />
                </button>
              </section>
              <section className="progress-week">
                <div>
                  <span className="eyebrow">THIS WEEK</span>
                  <h2>
                    {weeklyCount} of {plan.length} sessions
                  </h2>
                  <p>Your goal is a little consistency.</p>
                </div>
                <div className="goal-track">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <div className="week-checks">
                  {plan.map((item, index) => (
                    <div key={item.id} className={weeklyDone(index) ? 'checked' : ''}>
                      <span>
                        {weeklyDone(index) ? <Check size={19} /> : <Dumbbell size={19} />}
                      </span>
                      <b>{weekdays[item.day].slice(0, 3)}</b>
                    </div>
                  ))}
                </div>
                <p className="progress-note">
                  <Leaf size={16} /> Recovery is part of making progress.
                </p>
              </section>
            </div>
            <section className="activity-card">
              <div className="section-title">
                <div>
                  <span className="eyebrow">YOUR EFFORT, ON THE RECORD</span>
                  <h2>Recent activity</h2>
                </div>
                <span className="section-chip">{history.length} sessions</span>
              </div>
              {history.length ? (
                <div className="activity-list">
                  {[...history].reverse().map((item) => (
                    <div className="activity-row" key={item.id}>
                      <span className="activity-check">
                        <Check size={18} />
                      </span>
                      <div>
                        <b>{item.title}</b>
                        <small>
                          {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </small>
                      </div>
                      <span>
                        Completed <Check size={13} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>
                    <CalendarDays size={32} />
                  </span>
                  <h3>This is where your wins will live.</h3>
                  <p>Finish a workout and we’ll keep it here for you.</p>
                  <button className="outline" onClick={() => changeTab('My plan')}>
                    Explore my plan <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
          </>
        )}
        <footer>
          <a
            className="footer-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changeTab('Home');
            }}
          >
            stride<span>.</span>
          </a>
          <span>Movement for your everyday.</span>
          <small>YOUR PACE. YOUR PROGRESS.</small>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ name, Icon }) => (
          <button
            key={name}
            className={tab === name ? 'active' : ''}
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => changeTab(name)}
          >
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
      {editing && (
        <ProfileWizard
          profile={profile}
          firstTime={!personalized}
          onSave={saveProfile}
          onClose={() => setEditing(false)}
        />
      )}
      {session && (
        <WorkoutSession
          key={`${state.planId}-${active}`}
          workout={workout}
          draft={draft}
          onUpdate={updateSession}
          onGuide={setGuide}
          onFinish={finish}
          onClose={() => setSession(false)}
        />
      )}
      {guide && <ExerciseGuide key={guide} name={guide} onClose={() => setGuide(null)} />}
      {celebration && (
        <Celebration
          title={celebration}
          onClose={() => setCelebration(null)}
          onProgress={() => {
            setCelebration(null);
            changeTab('Progress');
          }}
        />
      )}
    </div>
  );
}
function Celebration({ title, onClose, onProgress }) {
  const ref = React.useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      className="celebration-dialog"
      ref={ref}
      onCancel={onClose}
      aria-labelledby="celebration-title"
    >
      <div className="dialog-padding">
        <button className="close" onClick={onClose} aria-label="Close workout celebration">
          <X />
        </button>
        <span className="celebration-icon">
          <Trophy size={36} />
        </span>
        <span className="eyebrow">THAT WAS TIME WELL SPENT.</span>
        <h2 id="celebration-title">
          You showed up.
          <br />
          That’s a win.
        </h2>
        <p>
          <b>{title}</b> is complete. Take a breath, drink some water, and give yourself a little
          credit.
        </p>
        <button className="primary wide" onClick={onProgress}>
          See my progress <ArrowRight size={18} />
        </button>
        <button className="text-button" onClick={onClose}>
          Back to my day
        </button>
      </div>
    </dialog>
  );
}
