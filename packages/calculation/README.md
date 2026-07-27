# Calculation module

This implements section 8 of `BTF_Recipe_Builder_Architecture_Plan.md` — the deterministic,
AI-free math layer of the BTF Recipe Builder. All 24 unit tests pass as of this writing.

## Files

| File | Responsibility |
|---|---|
| `types.ts` | Shared types + default tolerance constants |
| `prescription.ts` | `reconcilePrescription` — given any two of {calories, final volume, density}, calculates the third; flags inconsistency if all three are given and disagree |
| `blending.ts` | `calculateWaterTopUp` (post-blend water addition) and `calculateVerifiedDensity` (actual vs. target density after measuring final volume) |
| `iddsi.ts` | `interpretIddsiFlowTest` — interprets a *physically performed* 10 mL syringe gravity flow test; `compareToTargetIddsiLevel` — checks a measured level against the recipe's target |
| `index.ts` | Barrel export |
| `calculations.test.ts` | Test suite (plain `node:assert`, no test framework dependency) |

## Running it

```bash
npm install --no-save typescript tsx
npx tsx calculations.test.ts
```

No other dependencies. Everything here is a pure function — no network calls, no AI, no side effects — so it's straightforward to port into whatever frontend/backend framework you land on, or to call directly from the API layer described in section 3 of the plan.

## Design notes carried over from the plan

- **IDDSI is never predicted from ingredients.** `interpretIddsiFlowTest` only interprets a result the user physically measured. There's no function anywhere in this module that takes an ingredient list and outputs a texture level — that's deliberate.
- **Level 4 is flagged, not asserted.** If nothing flows through the syringe in 10 seconds, the module reports Level 4 as unconfirmed and recommends the IDDSI fork-drip test, rather than confidently claiming Level 4.
- **Nothing here overwrites user input.** When all three prescription values are entered and they don't reconcile, `reconcilePrescription` returns a warning — it doesn't pick a "correct" one for the user.
- **Tolerances are parameters, not hardcoded.** Default consistency tolerance is 5%, default density tolerance is 10% — both overridable per call. Worth revisiting these defaults once you have real-world recipes to check them against.

## What's intentionally *not* here yet

- Any connection to the AI recipe-generation call (section 5 of the plan) — this module only consumes numbers, it doesn't produce recipes.
- Multi-day/rotating recipe math (deferred per the "still open" note in section 9).
- UI wiring — these are framework-agnostic functions, ready to be called from whatever the step 5 "generate & review" screen ends up being.

## Suggested next step

Wire `reconcilePrescription` into the step 1 wizard screen first — it's the simplest of the four and has no dependency on the others, so it's a good first PR.
