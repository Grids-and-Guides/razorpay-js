# Revamp Plan: razorpay-hook → multi-framework Razorpay Checkout SDK

> Status: **Phase 1 in progress** (branch `revamp/phase-1`) · Last updated: 2026-11-21
> Owners: Grids and Guides maintainers · Feedback: open an issue or comment on the planning PR

This document is the single source of truth for the revamp. Each section ends with a
**Decision** line; items marked `OPEN` need maintainer sign-off before work starts.

---

## 0. Why revamp

`razorpay-hook@1.3.0` works, but has a generic name, a single-package layout that can't grow to other
frameworks, no tests, no CI, manual publishing, and several correctness bugs (see §3). The goal is
a well-tested, typed, framework-agnostic Razorpay Checkout SDK that is easy for outside
contributors to work on.

---

## 1. Package name

### What's free on npm (checked 2026-11-21)

| Candidate                                            | Status                                                                                     | Verdict                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `@react-razorpay`                                    | Scope only, not a package name. A React-named scope makes `@react-razorpay/vue` look wrong | ❌                                              |
| `razorpay-react`                                     | **Free** (unscoped)                                                                        | ✅ Good if we stay React-only                   |
| `@razorpay-react`                                    | Scope only, same React-naming problem                                                      | ❌                                              |
| `@razorpay/react`                                    | The `@razorpay` scope **belongs to Razorpay** (they publish `@razorpay/blade` there)       | ❌ Only possible if Razorpay adopts the project |
| `razorpay/react`                                     | Not a valid npm name (an unscoped name can't contain `/`)                                  | ❌                                              |
| `react-razorpay`                                     | Taken (a separate community package, last published 2024-09)                               | ❌                                              |
| `razorpay-vue`, `ngx-razorpay`                       | Taken                                                                                      | Shows that unscoped names get claimed by others |
| `razorpay-angular`, `razorpay-svelte`, `razorpay-js` | Free                                                                                       | —                                               |

### Recommendation

Use a **framework-neutral npm org scope**, so every adapter lives under one namespace we
control and nobody can take the names first:

```
@razorpay-js/core      ← framework-agnostic loader + typed checkout + types
@razorpay-js/react     ← React hook (works in Next.js, React Router/Remix, TanStack)
@razorpay-js/vue       ← later
@razorpay-js/angular   ← later
```

- GitHub repo: rename `Grids-and-Guides/razorpay-hook` → `Grids-and-Guides/razorpay-js`.
  GitHub redirects the old URL, and the stars, issues and history stay.
- If the `razorpay-js` org is taken, fallbacks in order: `@rzp-checkout`, `@razorpay-sdk`.
  Check availability at https://www.npmjs.com/org/create. You must be logged in, because npm
  hides org pages from anonymous users.
- **Trademark:** "Razorpay" is Razorpay's brand. Until Razorpay approves the name (§11), every README
  and package description must say _"Community-maintained. Not affiliated with or endorsed by
  Razorpay."_ If Razorpay later adopts the project, we move it to `@razorpay/react`.
- **Old package:** once `@razorpay-js/react@1.0.0` ships, run
  `npm deprecate razorpay-hook "Moved to @razorpay-js/react — see MIGRATION.md"`.
  Security fixes for `razorpay-hook` continue for 6 months after that.

**Decision:** ✅ `@razorpay-js` (decided 2026-11-21). Still to do: register the npm org and rename the GitHub repo.

---

## 2. Can we support Angular, Vue, Svelte, etc.?

**Yes, and it costs little.** Razorpay's web checkout is one browser script
(`checkout.razorpay.com/v1/checkout.js`) that exposes `window.Razorpay`. About 90% of the logic has
nothing to do with any framework:

- loading the script once (a shared promise, with timeout, retry and CSP nonce)
- TypeScript types for every checkout option, event and response
- a promise-based `openCheckout()` that resolves on success and rejects on failure or dismiss
- SSR safety (does nothing on the server)

That logic goes in `@razorpay-js/core`. Each adapter is then a thin wrapper of roughly 50–150 lines:

| Framework     | Adapter shape                                                            | Build tool                                                |
| ------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| React         | `useRazorpay()` hook, file marked `"use client"`                         | tsdown                                                    |
| Vue 3 / Nuxt  | `useRazorpay()` composable + optional plugin                             | tsdown                                                    |
| Angular       | `RazorpayService` (injectable, `providedIn: 'root'`), signals for status | **ng-packagr** (Angular needs the Angular Package Format) |
| Svelte        | store / rune helper                                                      | svelte-package                                            |
| Vanilla / any | use `@razorpay-js/core` directly                                         | —                                                         |

**Out of scope:** React Native, Flutter, iOS and Android. Razorpay already maintains official native
SDKs for those (`react-native-razorpay`, etc.).

**Decision:** Ship `core` + `react` first (v1). Add Vue and Angular in Phase 3, only if someone
volunteers to maintain each adapter. Every adapter needs a named maintainer in `CODEOWNERS`.

---

## 3. Audit of the current code (v1.3.0)

These bugs are fixed in the rewrite, and each gets a regression test:

| #   | Problem                                                                                                                                                                        | Where                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| 1   | `next` is a **peerDependency**, but the code never imports Next. Every Vite, Remix and TanStack user gets peer warnings                                                        | `package.json`           |
| 2   | Two components mounting while the script is still loading each append a **duplicate `<script>`**. The check only looks at `window.Razorpay`, not at a load already in progress | `src/use-razorpay.ts`    |
| 3   | The library calls **`alert()`** on load failure. A library should report errors to the app and never show its own UI                                                           | `src/use-razorpay.ts:37` |
| 4   | The hook returns the class with no loading state. Calling `new Razorpay()` before the script loads throws `window.Razorpay is not a constructor`                               | `src/use-razorpay.ts`    |
| 5   | Order ID validation rejects **subscription checkouts**, which pass `subscription_id` and no `order_id`. If validation fails, `open()` then crashes on `undefined`              | `src/razorpay.ts`        |
| 6   | `retry.max_count` is typed as `boolean`. It should be `number`                                                                                                                 | `src/types.ts`           |
| 7   | The `notes` type is self-contradictory, so it accepts nothing useful                                                                                                           | `src/types.ts`           |
| 9   | `loadScript` calls `reject` on the server but keeps running and touches `document`                                                                                             | `src/use-razorpay.ts:9`  |
| 10  | Logs `console.info`/`console.error` noise in production                                                                                                                        | `src/razorpay.ts`        |
| 11  | Leftovers in the build config: tsconfig includes a non-existent `a.tsx`, target is `es5`, and rollup loads postcss although there is no CSS                                    | config                   |
| 12  | `package.json` says `ISC`, but there is no LICENSE file                                                                                                                        | root                     |

---

## 4. Proposed public API (v1 of the new packages)

```ts
// @razorpay-js/core
loadRazorpay(opts?: { src?: string; timeoutMs?: number; nonce?: string }): Promise<RazorpayConstructor>
openCheckout(options: CheckoutOptions): Promise<PaymentSuccess>   // rejects with PaymentFailedError | CheckoutDismissedError
createCheckout(options: CheckoutOptions): Promise<RazorpayInstance> // low-level: .open() .close() .on()
export type { CheckoutOptions, PaymentSuccess, PaymentFailure, RazorpayEvent, ... }

// @razorpay-js/react
const { status, error, isReady, openCheckout } = useRazorpay({ loadOnMount: true })
//      'idle' | 'loading' | 'ready' | 'error'
```

```tsx
'use client';
const { isReady, openCheckout } = useRazorpay();

async function pay() {
  const order = await fetch('/api/orders', { method: 'POST' }).then((r) => r.json());
  try {
    const res = await openCheckout({ key: KEY_ID, order_id: order.id, name: 'Acme' });
    await fetch('/api/verify', { method: 'POST', body: JSON.stringify(res) }); // verify the signature on the server
  } catch (e) {
    if (e instanceof CheckoutDismissedError) return;
    // handle PaymentFailedError
  }
}
```

- `@razorpay-js/react` still exports a deprecated `Razorpay` class, so a `razorpay-hook` user can
  migrate by changing only the import. `MIGRATION.md` documents the full migration.
- Validation is opt-in and allows both `order_id` and `subscription_id`. Errors are thrown as typed
  error classes and are never logged.

**Decision:** Implemented as above in Phase 1. Feedback welcome before `1.0.0` stable.

---

## 5. Monorepo layout

**Tooling:** pnpm workspaces + **Turborepo**. Turborepo is the right size for a handful of
packages: task caching, `dependsOn` ordering, near-zero config. Nx is more than we need, and Lerna
has no advantage over pnpm workspaces plus Changesets.

```
razorpay-js/
├─ packages/
│  ├─ core/                 @razorpay-js/core      (zero runtime deps)
│  └─ react/                @razorpay-js/react     (peer: react >=18)
├─ examples/
│  ├─ server/               shared order + verify API (Hono + official `razorpay` Node SDK)
│  ├─ react-vite/
│  ├─ nextjs/               App Router, route handlers for order/verify
│  ├─ react-router/         framework mode (this is what "Remix" became in React Router v7)
│  └─ tanstack-router/      (+ TanStack Start variant later)
├─ tooling/
│  ├─ tsconfig/             shared base tsconfigs
│  └─ eslint-config/        shared flat config
├─ .changeset/
├─ .github/                 workflows, issue/PR templates, CODEOWNERS
├─ turbo.json  pnpm-workspace.yaml  package.json
└─ README.md  CONTRIBUTING.md  MIGRATION.md  SECURITY.md  CODE_OF_CONDUCT.md  LICENSE
```

- Examples depend on packages through `workspace:*`, so they always run against local source.
- Examples are `private: true` and are never published.
- `packageManager` is pinned in the root `package.json`, so Corepack gives every contributor the same pnpm.

---

## 6. Package build best practices

- **Build:** `tsdown` (Rolldown-based successor to tsup). Fallback: `tsup`. Output is ESM + CJS + `.d.ts`/`.d.cts`.
- **`exports` map** with `types`/`import`/`require` conditions; `"sideEffects": false`; `"files": ["dist"]`.
- **`"use client"` banner** on the React entry so it works in React Server Component apps without user boilerplate.
- **Peer deps:** `react >=18` only. Drop `next` and `react-dom`.
- **Publish checks in CI:** `publint` + `@arethetypeswrong/cli` (catches broken exports and types), plus
  `size-limit` with a budget (target: core < 2 kB gzip, react < 1 kB gzip).
- **TypeScript:** `strict`, `target ES2020`, `moduleResolution: bundler`, `verbatimModuleSyntax`, `isolatedDeclarations`.
- **Node:** support the active LTS lines (22, 24). Node 20 reached end-of-life in April 2026.
- **License:** switch to **MIT** (the most common license for this kind of library) and add a LICENSE file.

---

## 7. Testing

| Layer         | Tool                            | What                                                                                              |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Unit          | **Vitest** + jsdom              | script loader (dedup, timeout, error, SSR no-op), `openCheckout` resolve/reject, type guards      |
| React         | Vitest + @testing-library/react | hook status changes, StrictMode double-mount, unmount mid-load                                    |
| Types         | `expectTypeOf` (Vitest)         | public types don't regress                                                                        |
| E2E (Phase 2) | Playwright                      | each example app opens checkout against a **mocked** `checkout.js` (no live Razorpay calls in CI) |

Coverage gate: 90% lines on `core`, 85% on `react`.

**Decision:** ✅ **Vitest** (decided 2026-11-21). The original plan said Jest. I recommend **Vitest**: it reads the same
TS/ESM config as our build with no transform setup, and its API is Jest-compatible, so contributors
who know Jest are productive right away. If we choose Jest instead, use Jest 30 + `@swc/jest`. The
rest of the plan doesn't change.

---

## 8. Code quality tooling

- **ESLint 9 flat config** + `typescript-eslint` + `eslint-plugin-react-hooks`, shared from `tooling/eslint-config`
- **Prettier** for formatting. ESLint does not enforce formatting rules
- **Husky** + **lint-staged**: the pre-commit hook runs eslint --fix and prettier on staged files only
- **commitlint** (Conventional Commits) in the `commit-msg` hook
- **EditorConfig** + `.vscode/extensions.json` recommendations
- _Alternative considered:_ Biome, which replaces ESLint and Prettier with one fast tool. Not chosen
  for v1 because ESLint's React hooks rules matter here.

---

## 9. CI/CD (GitHub Actions)

| Workflow              | Trigger                                    | Jobs                                                                                                                           |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`              | PR, push to `develop`/`main`               | install (pnpm cache) → `turbo run lint typecheck test build` → publint/attw → size-limit → build examples; Node 22 & 24 matrix |
| `release.yml`         | push to `develop` / `main`                 | On `develop`: opens/updates the **"Version Packages" PR**. On `main`: publishes to npm + GitHub releases                       |
| `e2e.yml`             | PR touching `packages/**` or `examples/**` | Playwright against example apps (Phase 2)                                                                                      |
| `pr-title.yml`        | PR                                         | Conventional-commit PR title check (we squash-merge)                                                                           |
| Dependabot / Renovate | weekly                                     | grouped dependency updates                                                                                                     |
| CodeQL                | weekly + PR                                | security scanning                                                                                                              |

### Automated npm publishing

- **Changesets** handles versioning. Each PR that changes behaviour includes a
  `.changeset/*.md` (`pnpm changeset`). Changesets generates the version bumps and CHANGELOGs.
- Publish with **npm Trusted Publishing (OIDC)** from GitHub Actions. There is no `NPM_TOKEN`
  secret to leak or rotate, and **provenance attestations** are automatic (the npm page shows a
  "Built and signed on GitHub Actions" badge).
  This matters for a payments library, and npm has been phasing out long-lived publish tokens.
- Prereleases: `changeset pre enter next` → publishes under the `next` dist-tag for beta testing.
- **Branches:** `develop` is the default branch and every PR targets it. `main` is the release branch and only receives `develop` merges.
- Branch protection on both: CI must pass, 1 review required. `develop` uses squash merge only; `develop` → `main` uses a merge commit.

---

## 10. Contributor experience

Root scripts:

```
pnpm install            # one-time
pnpm dev                # watch-build packages + run an example (turbo)
pnpm dev --filter=example-nextjs
pnpm test / test:watch / lint / typecheck / build
pnpm changeset          # describe your change for the changelog
```

Files to add:

- **CONTRIBUTING.md**: setup, repo tour, how to run examples with Razorpay **test-mode** keys, how to add a changeset, commit convention, release process
- **SECURITY.md**: private vulnerability reporting (enable GitHub's private reporting); state that `key_secret` must never reach the browser
- **CODE_OF_CONDUCT.md** (Contributor Covenant), **CODEOWNERS**, issue forms (bug / feature / new framework adapter), PR template with checklist
- `.env.example` in each example (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` for the server only)
- Labels: `good first issue`, `help wanted`, `adapter:vue`, `adapter:angular`, `hacktoberfest`
- One-click **StackBlitz/CodeSandbox** links for each example

---

## 11. Roadmap

| Phase                   | Scope                                                                                                                  | Exit criteria                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **0 · Decide**          | Settle the `OPEN` decisions; register the npm org; rename the repo                                                     | Decisions merged into this doc                                      |
| **1 · Foundation**      | Monorepo, tooling, CI, Changesets + trusted publishing, `core` + `react` rewrite with tests, LICENSE + community files | `@razorpay-js/react@1.0.0-next.x` published from CI with provenance |
| **2 · Examples & docs** | 4 example apps + shared server, Playwright E2E, MIGRATION.md, docs site (VitePress or Starlight) with live demos       | `1.0.0` stable; `razorpay-hook` deprecated                          |
| **3 · Ecosystem**       | Vue + Angular adapters (each with a named maintainer), Svelte if requested                                             | Adapter at parity with React, ≥85% coverage                         |
| **4 · Growth**          | Outreach (§12), contributor onboarding, regular releases                                                               | See success metrics                                                 |

---

## 12. Promotion & working with Razorpay

### 12.1 Approaching Razorpay

Razorpay already does open source (Blade design system, i18nify, official mobile SDKs), so a
well-built community web SDK fits their ecosystem. Possible asks, smallest first:

1. **Name approval:** written OK to use "Razorpay" in the package and org names, with our disclaimer.
2. **Docs listing:** a link from Razorpay's web-integration docs or developer community pages to our package and examples.
3. **Technical review:** a Razorpay engineer reviews the types/API against their checkout script. Ideally they also send advance notice of checkout changes.
4. **Co-maintenance or adoption:** a Razorpay engineer in `CODEOWNERS`, or a transfer to the `@razorpay` scope as `@razorpay/react`.

**When to reach out:** only after Phase 1 ships (published, tested, CI green, provenance on). A
link to a polished repo makes a much stronger case than a plan.

**Channels:** Razorpay's developer relations / developer community, their GitHub org
(`github.com/razorpay`, e.g. an issue or discussion on a related repo), engineers who speak at
React India / JSConf India, and LinkedIn messages to their DevRel or frontend platform leads.

**Draft outreach message:**

> Hi <name>, I maintain `razorpay-hook`, a community React library for Razorpay Checkout
> (<N> weekly downloads). We've rebuilt it as `@razorpay-js`: a typed, framework-agnostic core with
> React (and soon Vue/Angular) adapters, full tests, and npm provenance. Examples cover Next.js,
> React Router and TanStack.
> Repo: <link> · Demo: <link>
> We'd like to (a) confirm you're comfortable with the name and our "not affiliated" disclaimer,
> and (b) explore a listing in your web integration docs. We'd also welcome a review from your
> checkout team. Happy to walk you through it in 20 minutes.

### 12.2 Growing the community

- **Launch posts:** dev.to / Hashnode ("Type-safe Razorpay in Next.js App Router in 5 minutes"), r/reactjs, r/developersIndia, X/LinkedIn
- **Answer existing Q&A:** Stack Overflow and GitHub issues where people hit the exact bugs in §3 (duplicate scripts, `Razorpay is not a constructor`, SSR errors)
- **Awesome lists:** awesome-react, awesome-nextjs, awesome-india-tech
- **Hacktoberfest:** add the repo topic and keep 5–10 labeled `good first issue`s ready every October
- **Meetups:** a 10-minute lightning talk at React/JS meetups in India
- **Discoverability:** npm keywords (`razorpay`, `payment`, `checkout`, `react`, `nextjs`, `vue`, `angular`, `upi`); README badges (npm version, CI, coverage, provenance, bundle size)

### Success metrics (review quarterly)

- Weekly npm downloads (baseline: current `razorpay-hook` numbers)
- External contributors with a merged PR
- Median time to first response on issues (target < 3 days)
- Razorpay engagement milestones (1–4 above)

---

## 13. Open decisions (summary)

| #   | Decision           | Recommendation                                              |
| --- | ------------------ | ----------------------------------------------------------- |
| D1  | Package scope      | ✅ `@razorpay-js/*`                                         |
| D2  | Test runner        | ✅ Vitest                                                   |
| D3  | License            | MIT                                                         |
| D4  | v1 framework scope | core + react; Vue/Angular in Phase 3 with named maintainers |
| D5  | API shape (§4)     | Promise-based `openCheckout` + status-returning hook        |
| D6  | Build tool         | tsdown (fallback tsup)                                      |
