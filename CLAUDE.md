# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A stateless calculator tool (no accounts, no server-side patient data) that helps patients,
families, and caregivers build nutritionally complete, individualized blenderized tube feeding
(BTF) recipes. Full system design, data schema, workflow, and example walkthrough live in
`docs/architecture-plan.md` — read it before making architectural decisions; it is the source
of truth, not this file.

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
npm run test         # runs the calculation package's Vitest suite (vitest run)
npm run test:watch   # same, in watch mode (vitest)
npm run dev          # next dev, in apps/web
npm run build        # next build, in apps/web
```

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

### `apps/web`

Next.js App Router scaffold. It depends on `@btf-recipe-builder/calculation` via the workspace
(`"@btf-recipe-builder/calculation": "*"` in its `package.json`), and the homepage
(`src/app/page.tsx`) already imports and calls `reconcilePrescription`, rendering the result —
this exists only as a smoke test proving the workspace link works, not as real UI. Routes,
components, and styling direction beyond that one page reflect no real decision yet.

### Open design question to be aware of

`docs/architecture-plan.md` §4 flags an undecided schema question: whether `medical_restrictions`
should split into three explicit arrays (absolute exclusion / limit / disliked-but-permitted)
rather than folding "limit" into `food_preferences` status. Check that section before building
anything that consumes or produces the restrictions schema.
