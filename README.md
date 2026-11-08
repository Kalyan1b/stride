# Stride

A friendly React workout planner with goal-based routines, real-person exercise demonstrations, guided workout sessions, rest timers, and browser-local progress.

## Local development

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run format:check
npm test
npm run build:pages -- --preview
```

Tests cover 432 combinations of goals, experience, schedules, and available equipment, plus history migration, plan changes, repeated sessions, timer deadlines, corrupt saved data, and the setup → workout → progress flow. They do not replace visual browser testing.

## GitHub Pages

Target repository: https://github.com/Kalyan1b/stride

Production URL after successful deployment: https://kalyan1b.github.io/stride/

The Pages build derives its base path from `GITHUB_REPOSITORY`; local development defaults to `/`. Exercise photos and GIFs use Vite's base URL.

## Branches

| Branch | Purpose                                                  | Publishes production?  |
| ------ | -------------------------------------------------------- | ---------------------- |
| `dev`  | Develop features and run checks                          | No                     |
| `test` | Validate release candidates and review preview artifacts | No                     |
| `main` | Production                                               | Yes, after checks pass |

Promotion follows **dev → test → main**, through pull requests. There is no separate `prod` branch. See [the release guide](docs/BRANCHING.md).

## Data and demonstrations

Profiles, completed sessions, and unfinished workouts stay in this browser's localStorage. No account or backend is required. Refreshing or reopening the app recovers your selected workout, checkmarks, position, and rest timer. Each completion gets its own history record and a snapshot of the plan used. Changing training preferences starts a new plan without assigning old completion checkmarks to it; changing your name or measurements keeps your current plan. Older profile/history keys are read during migration and retained as an original backup. The planner is intended for adults and provides general fitness guidance.

Guides contain 10 full-motion GIFs, 5 photographic pose sequences, and 8 hosted instructor videos. GIFs and photos are local assets; hosted videos require internet access. Reduced-motion users see still images until they choose playback. Reverse lunges include a local full-motion GIF, start/lowered-position stills, and a link to the full instructor tutorial.

Credits, sources, and media licenses appear in the guides and [the attribution catalog](public/exercises/ATTRIBUTION.json). Goulart's wger video derivatives retain CC BY-SA 4.0; public-domain sources are identified separately. These media licenses do not determine the application code's license.

## Equipment and data reliability

Dumbbell and bodyweight profiles can explicitly select a bench or a low exercise step. Bench presses and step-ups are assigned only when their equipment is available. Old profiles without these options default to no extra furniture unless a full gym was selected.

State is saved together under `stride-state-v2`. Invalid profile fields fall back to valid values; invalid dates and malformed history entries are filtered without crashing. Legacy sessions remain visible in history but are not guessed to belong to a new plan. If browser storage fails, a persistent warning explains that changes are available only for the current visit. Clearing browser storage still removes local records.

Rest timers use a deadline so delayed callbacks do not extend the rest. Paused timers retain their remaining time across refreshes.

## Exercise variety

Each scheduled day has a distinct, deterministic exercise list. Muscle plans use two full-body sessions for two-day schedules, or upper/lower/full-body plus shoulder and single-leg variants for longer schedules. New movements include dumbbell Romanian deadlifts, floor split squats, standing calf raises, dumbbell lateral raises, and standing rear-delt flies; inclusion depends on equipment, goal, and days available. Bodyweight plans retain suitable unloaded alternatives.

Keep the same program for 4–6 weeks to compare progress; increase difficulty gradually when you reach the top of the prescribed range with good form. The app does not track weights or automatically increase loads. The approach prioritizes consistency, appropriate effort, and repeatable movements, informed by [ACSM's 2026 guidance](https://acsm.org/resistance-training-guidelines-update-2026/). Guide instructions distinguish optional seated, single-leg, and elevated-foot demonstrations from the assigned variations.
