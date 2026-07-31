# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A stateless calculator tool (no accounts, no server-side patient data) that helps patients,
families, and caregivers build nutritionally complete, individualized blenderized tube feeding
(BTF) recipes. Full system design, data schema, workflow, and example walkthrough live in
`docs/architecture-plan.md` — read it before making architectural decisions; it is the source
of truth, not this file. `TASKS.md` tracks build progress against that plan's roadmap — check
it for current status and check items off there as work lands, rather than restating status here.

**Current state:** early-stage. `packages/calculation` is implemented and tested. `apps/web` is
otherwise a `create-next-app` scaffold (Next.js 16 / React 19 / Tailwind 4) — its homepage
currently does nothing but import `reconcilePrescription` from the workspace package and render
the result as a workspace-wiring smoke test. Routing, wizard UI, API layer, and the
recipe-generation engine described in the architecture plan do not exist yet.

## Commands

This is an npm workspaces monorepo (`apps/*`, `packages/*`) using **Vitest** for tests — that pairing
was a deliberate choice, not a scaffold default, so don't reach for Jest, pnpm, or yarn without a
reason to change it. Run from the repo root:

```bash
npm run test         # runs calculation + schema + apps/web's Vitest suites (vitest run)
npm run test:watch   # same, in watch mode (vitest)
npm run dev          # next dev, in apps/web
npm run build        # next build, in apps/web
```

`apps/web`'s Vitest suite runs under `jsdom` with `@testing-library/react`, configured in
`apps/web/vitest.config.ts` — this is the sanctioned way to verify wizard/UI behavior given this
machine's browser-automation constraint (see Environment Constraints below).

To run/filter the calculation package's tests directly:

```bash
cd packages/calculation
npx vitest run                        # all tests, once
npx vitest run -t "flags inconsistent"  # filter by test name
npx vitest                            # watch mode
```

There is no lint/typecheck script wired up at the root yet; `apps/web` has its own `npm run lint`
(eslint) via its workspace.

## Architecture

### Non-negotiable design principles

These come directly from `docs/architecture-plan.md` §2 and constrain any feature work in this
repo, not just the calculation module:

- **Structured input over free text.** Any AI call must receive a validated structured object
  built from wizard input — never a raw/open user prompt.
- **Constrained generation.** AI-generated recipes may only use ingredients from a pre-approved
  pool; the model cannot introduce foods that weren't cleared by the user's preferences/restrictions.
- **IDDSI texture level is never predicted from ingredients.** It must always come from a
  physically-performed 10-second syringe flow test. This is enforced in code, not just UX copy —
  see `packages/calculation/iddsi.ts`.
- **No server-side patient data.** Nothing about the patient persists beyond the current session's
  calculation unless a future opt-in "save recipe" feature deliberately changes that.
- **Nothing auto-advances.** Safety-relevant steps (finalizing a recipe, confirming the IDDSI test
  was actually performed) require explicit user confirmation.
- **The Claude API key is server-side only.** It must live in a server-side env var and never be
  read from, bundled into, or exposed to client code — the recipe engine call happens server-side
  by design (architecture plan §3, "API layer"/"Recipe engine" rows), not as a client-side fetch.

### Planned six-stage pipeline (see architecture-plan.md §3, §11 for full detail)

1. Intake wizard (5 steps) → 2. Structured data schema (single source of truth) → 3. AI recipe
generation (constrained ingredient pool) → 4. Nutrient validation (AI-estimated only for now, no
Cronometer integration) → 5. Status pipeline (draft → nutrient-checked → volume-confirmed →
IDDSI-tested) → 6. Caregiver-facing recipe card output.

Of this, only the **calculation module** (stage in support of the pipeline, not a stage itself)
is built.

### `packages/calculation`

Deterministic, dependency-free math — no AI, no network calls, no side effects. Every function is
pure. This is intentionally the first piece built because it's fully unit-testable in isolation
from the framework/UI decisions that haven't been made yet.

| File | Responsibility |
|---|---|
| `types.ts` | Shared types + default tolerance constants (consistency 5%, density 10% — both overridable per call, not hardcoded) |
| `prescription.ts` | `reconcilePrescription` — given any two of `{caloriesKcal, finalVolumeMl, densityKcalPerMl}`, computes the third; if all three are given and disagree beyond tolerance, returns a warning rather than silently picking one |
| `blending.ts` | `calculateWaterTopUp` (post-blend water addition to hit target volume) and `calculateVerifiedDensity` (actual vs. target density from measured final volume) |
| `iddsi.ts` | `interpretIddsiFlowTest` interprets a *physically performed* syringe test result — there is deliberately no function that infers texture from ingredients; `compareToTargetIddsiLevel` checks a measured level against target |
| `index.ts` | Barrel export |

Behavioral details worth knowing before modifying this module:

- IDDSI Level 4 (nothing flows in 10s) is flagged as *unconfirmed* rather than asserted — the
  syringe test alone can't distinguish it from higher levels; the module recommends the fork-drip
  test instead of guessing.
- `reconcilePrescription` throws on invalid input (fewer than two values provided, or non-positive
  values) but never throws on a three-value mismatch — it returns `inconsistencyWarning` instead,
  since silently overwriting a user-entered value is treated as a safety hazard, not just a UX nit.

### `packages/schema`

Small, pure, dependency-free, independently testable — same pattern as
`packages/calculation`. Holds the TypeScript types for the wizard's output object
(`docs/architecture-plan.md` §4) plus a validator for the exclusion/preference
precedence rule above. Consumed by `apps/web` for the wizard UI and, eventually, by
the server-side recipe-engine route (architecture plan §3).

| File | Responsibility |
|---|---|
| `types.ts` | `PatientIntake` and its component interfaces — `Patient`, `Prescription`, `MedicalRestrictions`, `FoodPreferences`, `PracticalConstraints`, `Feeding` |
| `validation.ts` | `validateFoodRestrictions` — flags an `absolute_exclusions` / `food_preferences` contradiction (rule 1); doesn't check `foods_to_limit`, since overlap there is expected (rule 2) |
| `index.ts` | Barrel export |

### `apps/web`

Next.js App Router scaffold. Depends on `@btf-recipe-builder/calculation` and
`@btf-recipe-builder/schema` via the workspace. The wizard lives at `/wizard`
(`src/app/wizard/page.tsx`), rendered by a single client component,
`src/components/wizard/Wizard.tsx`, which owns cross-step state and renders the
current step — one route for the whole wizard rather than one route per step,
since nothing needs to be deep-linked or persisted yet. Each step is its own
component under `src/components/wizard/` (e.g. `Step1NutritionBasics.tsx`),
taking an `onComplete` callback and handling its own form state/validation.
The homepage (`src/app/page.tsx`) is a minimal landing page linking to `/wizard`.
`src/lib/assemblePatientIntake.ts` combines the four wizard steps' outputs into one
`PatientIntake`. `src/lib/recipeEngine/` holds the `CandidateRecipe` shape and a
`mockRecipeEngine.ts` that stands in for the real (unbuilt) server-side recipe engine — Step 5
calls it directly for now; only this file's body should need to change once a real API-backed
engine lands.

### Restriction/preference precedence (resolved, binding on the recipe engine)

`docs/architecture-plan.md` §4 defines `medical_restrictions` with two arrays —
`absolute_exclusions` and `foods_to_limit` — and two precedence rules that any code touching
`food_preferences` or the recipe engine must honor:

1. **Absolute exclusion always wins**, even if the same ingredient is separately marked `preferred`
   in `food_preferences`. That contradiction must be flagged to the user, never silently resolved.
2. **A medical limit caps a taste preference, it doesn't lose to it** — `foods_to_limit` constrains
   quantity regardless of how strongly the food is preferred.

## Keeping this file current

Before finishing any task that adds a new package/workspace, introduces a
new architectural pattern, or changes how existing pieces connect, check
whether this file's Architecture section needs an update.

If it does: draft the proposed addition and ask for confirmation before
writing it. Do not silently edit this file. Keep entries short (1-2
sentences), matching the existing table's format.

## Environment Constraints

### Browser automation is not available
This machine runs macOS Monterey (mac12-arm64), which is not a supported
target for current Playwright browser binaries — Chromium and WebKit
downloads both fail. No `chromium-cli` or equivalent is installed either.

**Do not attempt:**
- Installing or invoking Playwright, Puppeteer, or any browser-driven
  testing/automation tool
- Adding Playwright (or similar) as a project dependency to work around
  this — it doesn't solve the underlying platform issue and wasn't part
  of the plan

**Instead, for this project:**
- Verify wizard/UI behavior via Vitest unit and component tests
- Verify calculation and schema logic via `packages/calculation` and
  `packages/schema` test suites
- Flag anything that genuinely needs visual/interactive browser
  verification back to the user for a manual check, rather than trying
  to automate it