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

Tests cover all 144 goal/experience/equipment/schedule combinations and the setup → workout → progress flow. They do not replace visual browser testing.

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

Profiles and completion history stay in this browser's localStorage. No account or backend is required. Unfinished workout checkmarks are kept only during the current visit. The planner is intended for adults and provides general fitness guidance.

Guides contain 9 full-motion GIFs, 4 photographic pose sequences, and 4 hosted instructor videos. GIFs and photos are local assets; hosted videos require internet access. Reduced-motion users see still images until they choose playback.

Credits, sources, and media licenses appear in the guides and [the attribution catalog](public/exercises/ATTRIBUTION.json). Goulart's wger video derivatives retain CC BY-SA 4.0; public-domain sources are identified separately. These media licenses do not determine the application code's license.
