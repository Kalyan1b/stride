# Stride development and release flow

**dev → test → main (production)**

1. Create feature branches from `dev`; open feature PRs back into `dev`.
2. Open a `dev` → `test` PR when a release candidate is ready.
3. Wait for `Promotion order` and `Validate`, then manually test the preview artifact.
4. Open a `test` → `main` PR after testing. Merging it publishes production.
5. After releases or hotfixes, merge `main` back into `test` and then `dev` as needed. Use merge commits between long-lived branches to preserve shared history.

The workflow rejects PRs into `test` unless they come from this repository's `dev`, and rejects PRs into `main` unless they come from this repository's `test`. Checks run for branch pushes and pull requests. Production deployment requires a successful validation job and a `main` branch run; feature branches, `dev`, `test`, and PR runs cannot deploy.

## Preview a candidate

Download the `preview-<run id>-<attempt>` artifact from the candidate's Actions run. Extract it, open a terminal in that directory, and run:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/stride/. These are downloadable previews; dev and test do not have separate hosted URLs.

For the same preview locally:

```sh
npm ci
npm run format:check
npm test
npm run build:pages -- --preview
python3 -m http.server 8080 --directory preview-site
```

Check desktop/mobile layout, profile setup, exercise guides and media, completing a workout, saved progress after reload, and keyboard navigation. The local preview uses storage separate from the public site.

## Required GitHub configuration

Set Pages to use GitHub Actions. Limit the `github-pages` environment's allowed deployment branches to `main`.

Protect `test` and `main`: require pull requests, the `Promotion order` and `Validate` status checks, and up-to-date branches; prevent force pushes and branch deletion. Include administrators in those rules if you want to prevent direct pushes even by the repository owner. A solo-maintainer workflow can use zero required reviewer approvals while still requiring PRs and checks.

GitHub protections must actually be applied to enforce these restrictions on direct pushes; workflow files alone cannot prevent someone bypassing the PR process.
