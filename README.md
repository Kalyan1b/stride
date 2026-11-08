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

Tests cover 432 equipment/program combinations, 960 time/movement-preference combinations, and actual React setup → set logging → progress interactions. They check history migration, plan changes, repeated and partial sessions, progression suggestions, swaps, scheduling, timer deadlines, and corrupt saved data. They do not replace visual browser testing.

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

Profiles, completed sessions, and unfinished workouts stay in this browser's localStorage. No account or backend is required. Refreshing or reopening the app recovers your selected workout, checkmarks, position, and rest timer. Each completion gets its own history record and a snapshot of the plan used. Changing training preferences starts a new plan without assigning old completion checkmarks to it; changing your name or measurements keeps your current plan. Older profile/history keys are read during migration and retained as an original backup. Height can be entered in centimeters or feet and inches. The preferred unit is saved and used in the profile summary; centimeters remain the canonical value for BMI. Switching units preserves the height and current workout plan. The planner is intended for adults and provides general fitness guidance.

Every exercise now has a local GIF: 18 full-motion demonstrations and 4 photographic pose sequences, with 8 optional hosted instructor tutorials. Bird dog, prone Y-T raises, and standing calf raises include full-motion GIFs plus named setup/extension, Y/T, or heel-position stills. The Y/T GIF includes both lifts; one Y-and-T pair counts as one rep. All exercises have easier practice options and common mistakes to avoid. GIFs and photos are local assets; hosted videos require internet access. Reduced-motion users see still images until they choose playback. Reverse lunges include a local full-motion GIF, start/lowered-position stills, and a link to the full instructor tutorial.

Credits, sources, and media licenses appear in the guides and [the attribution catalog](public/exercises/ATTRIBUTION.json). Goulart's wger video derivatives and Danielflefil's Wikimedia pike push-up derivative retain CC BY-SA 4.0; public-domain sources are identified separately. These media licenses do not determine the application code's license.

## Equipment and data reliability

Dumbbell and bodyweight profiles can explicitly select a bench or a low exercise step. Bench presses and step-ups are assigned only when their equipment is available. Old profiles without these options default to no extra furniture unless a full gym was selected.

State is saved together under `stride-state-v2`. The updated program signature separates old completion-only programs from set-based programs. On upgrading an earlier program, the original saved state is backed up under `stride-previous-program` and can be downloaded from Progress. Historical completions remain; unrecorded sets are never invented. Invalid profile fields fall back to valid values; invalid dates and malformed history entries are filtered without crashing. Legacy sessions remain visible in history but are not guessed to belong to a new plan. If browser storage fails, a persistent warning explains that changes are available only for the current visit. Clearing browser storage still removes local records.

Rest timers use a deadline so delayed callbacks do not extend the rest. Paused timers retain their remaining time across refreshes.

## Exercise variety

Each scheduled day has a distinct, deterministic exercise list. Muscle-focused plans use two full-body sessions for two-day schedules, upper/lower/full-body for three days, and upper/lower variants for four days; five-day plans add mobility rather than another overlapping hard session. Fat-loss-focused plans retain two full-body strength sessions and add conditioning as the number of days increases. Stay-active and endurance plans retain their separate movement/conditioning focus. These exercise programs support goals but do not guarantee bodyweight changes. New movements include dumbbell Romanian deadlifts, floor split squats, standing calf raises, dumbbell lateral raises, and standing rear-delt flies; inclusion depends on equipment, goal, and days available. Bodyweight plans retain suitable unloaded alternatives.

Keep the same program for 4–6 weeks to compare progress; increase difficulty gradually when you reach the top of the prescribed range with good form. Set logging records actual reps or time, optional external load in kilograms, and effort. It suggests how to progress based on the most recent performance of the same exercise, but never increases loads automatically. The approach prioritizes consistency, appropriate effort, and repeatable movements, informed by [ACSM's 2026 guidance](https://acsm.org/resistance-training-guidelines-update-2026/). Guide instructions distinguish optional seated, single-leg, and elevated-foot demonstrations from the assigned variations.

## Training flow and recovery

Every strength movement has structured sets and rep/time targets. Log each actual set; the rest timer starts between sets and supports 30–300 seconds. Choose “too easy”, “about right”, or “too hard” before moving on. Values below the target are accepted as honest results. For dumbbells, record the weight of one dumbbell consistently. Skipping a movement records the reason and saves a partial session, including any sets actually completed before stopping. Partial sessions and repeated completions of the same session do not fill additional weekly plan checkmarks.

Exercise swaps are limited to the same movement group and your available equipment and exclusions. Logged sets must be undone before swapping; changing movements never reuses the old movement's results. Progress shows actual sets and effort by exercise. Comparisons require matching units, side convention, set count, and explicit recorded loads for rep-based exercises; they are not a body-composition estimate.

Setup accepts a session budget (20/30/45/60 minutes), preferred weekdays, movement filters, and specific exercise exclusions. Session estimates include a five-minute warm-up, working sets, prescribed rest, and transitions. Short sessions reduce sets or timed work to fit; changing rest or moving more slowly can extend actual time. Exclusions may remove movements when a suitable substitute is unavailable; the app identifies adapted plans and blocks setup if a session has no suitable exercises. These filters are preferences, not injury rehabilitation guidance.

Use “Move sessions & resume after a break” to choose dates or space unfinished sessions two days apart starting today. Incomplete assigned dates remain visible after a week changes; completed sessions recur in the new week. Rescheduling preserves unfinished set logs. After a long break, progression guidance recommends an easier restart.

Rebuild a demonstration from its attributed source with `node scripts/build-real-demos.mjs exercise-slug` (network required for direct video sources). For the three YouTube originals, download the source linked in the attribution catalog and pass its MP4 path as a third argument, for example `node scripts/build-real-demos.mjs bird-dog /path/to/bird-dog.mp4`. The catalog records exact trims, joined excerpts, still positions, creator credits, and verified reuse information; original creator marks are retained. Sources are cached under the operating system's temporary directory; the script no longer relies on a preexisting developer-only catalog in `/private/tmp`.
