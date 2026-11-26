# Contributing to razorpay-js

Thanks for helping! This guide covers everything from setup to release.

## Prerequisites

- **Node.js 22 or 24** (`.nvmrc` pins 24: run `nvm use`)
- **pnpm**: run `corepack enable`. The exact version comes from `packageManager` in `package.json`.

## Setup

```bash
git clone https://github.com/Grids-and-Guides/razorpay-js.git
cd razorpay-js
corepack enable
pnpm install      # also installs the git hooks
pnpm build
pnpm test
```

## Repository layout

```
packages/core     @razorpay-js/core   framework-agnostic loader, checkout helpers, types
packages/react    @razorpay-js/react  React hook (re-exports everything from core)
tooling/          shared tsconfig and ESLint config (private)
examples/         example apps (coming in Phase 2)
.changeset/       pending release notes
```

## Everyday commands

| Command                                 | What it does                                     |
| --------------------------------------- | ------------------------------------------------ |
| `pnpm dev`                              | Rebuilds every package on change                 |
| `pnpm test`                             | Runs all tests once                              |
| `pnpm test:watch`                       | Vitest watch mode (no build needed)              |
| `pnpm test:coverage`                    | Tests with a coverage report in `coverage/`      |
| `pnpm lint` / `pnpm lint:fix`           | ESLint                                           |
| `pnpm format`                           | Prettier                                         |
| `pnpm typecheck`                        | `tsc --noEmit` in every package                  |
| `pnpm build`                            | Builds packages to `dist/`                       |
| `pnpm check:exports`                    | publint + arethetypeswrong on the built packages |
| `pnpm size`                             | Checks bundle size budgets                       |
| `pnpm --filter @razorpay-js/react test` | Runs one package's script                        |

## Making a change

1. Open or pick an issue. For anything bigger than a bug fix, agree on the approach in the issue first.
2. Branch from `develop` (the default branch). PRs target `develop`; `main` only receives releases.
3. Write tests alongside the change. Tests live in each package's `test/` folder. Use the fake
   `window.Razorpay` in `packages/core/test/helpers.ts`. Tests must never load the real `checkout.js`.
4. **Add a changeset** if you changed a published package:
   ```bash
   pnpm changeset
   ```
   Pick the packages and bump type (`patch` = fix, `minor` = new feature, `major` = breaking),
   then write one or two sentences for the changelog, aimed at users.
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/), e.g.
   `fix(react): keep status after remount`. A commit hook checks this.
6. Open a PR. CI must pass, and a maintainer reviews it. We squash-merge, so the PR title must also
   be a conventional commit.

The pre-commit hook runs ESLint and Prettier on staged files.

## Testing against real Razorpay

Use **test mode** keys from the Razorpay Dashboard (`rzp_test_…`). Never commit keys. Example
apps read them from `.env` files, which git ignores. Razorpay's
[test card and UPI details](https://razorpay.com/docs/payments/payments/test-card-details/)
let you simulate success and failure.

## Code guidelines

- Public API changes need an issue and maintainer agreement first.
- `@razorpay-js/core` has **zero runtime dependencies** and no framework imports.
- No `console.*`, `alert()`, or other side effects in library code. Report errors through typed
  errors (`RazorpayError` subclasses) or returned state.
- Every exported function and type needs a TSDoc comment. These show up in users' editors.
- Keep within the size budgets in the root `package.json`.

## Adding a framework adapter

Open a "Feature request" issue first. A new adapter (e.g. `packages/vue`) needs:
a maintainer willing to own it in `CODEOWNERS`, tests at the same level as React, a README, and an
example app. Copy `packages/react` as a template; the adapter should be a thin layer over
`@razorpay-js/core`.

## Releasing (maintainers)

We use two long-lived branches:

| Branch    | Purpose                                                                             |
| --------- | ----------------------------------------------------------------------------------- |
| `develop` | Default branch. All PRs merge here.                                                 |
| `main`    | Release branch. Every push to `main` publishes whatever versions aren't on npm yet. |

Cutting a release:

1. As PRs with changesets land on `develop`, the **Release** workflow keeps a
   **"chore: version packages"** PR open against `develop`. It bumps versions and writes the CHANGELOGs.
2. When you're ready to release, merge that PR into `develop`.
3. Open a PR from `develop` → `main` titled `chore: release` and merge it with a **merge commit**
   (not squash), so `main` and `develop` keep the same history.
4. The push to `main` publishes to npm using
   [trusted publishing](https://docs.npmjs.com/trusted-publishers) with provenance, then creates
   git tags and GitHub releases. No npm token is stored anywhere.

The publish job refuses to run if unversioned changesets reach `main`, so step 2 can't be skipped by accident.
Because versioning happens on `develop`, there's nothing to merge back from `main` afterwards.

Prereleases: `pnpm changeset pre enter next` publishes to the `next` dist-tag until `pnpm changeset pre exit`.

### npm trusted publishing

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers): the Release
workflow proves its identity to npm with GitHub's OIDC token, so **no npm token is stored anywhere**,
and every release gets a provenance attestation.

Each package has a trusted publisher on npmjs.com (package → _Settings_ → _Trusted Publisher_) with:

| Field                             | Value                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Publisher                         | GitHub Actions                                                                 |
| Organization or user / Repository | `Grids-and-Guides` / `razorpay-js`                                             |
| Workflow filename                 | `release.yml`                                                                  |
| Environment                       | `npm`                                                                          |
| Allowed actions                   | `npm publish` (and the always-allowed `npm stage publish`); `npm dist-tag` off |

**Adding a new package** (e.g. a framework adapter): npm only allows a trusted publisher on a package
that already exists. Publish its first version manually with 2FA (`pnpm publish --access public` from
the package folder), then add the trusted publisher above. A new connection stays "Pending validation"
until the workflow publishes through it, and must be validated within npm's deadline.

Never add an `NPM_TOKEN` secret back to the repository.
