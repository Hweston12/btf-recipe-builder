# Schema module

TypeScript types for the wizard intake object defined in section 4 of
`docs/architecture-plan.md`, plus a validator for the precedence rules
between `medical_restrictions` and `food_preferences`.

## Files

| File | Responsibility |
|---|---|
| `types.ts` | `PatientIntake` and its component interfaces (`Patient`, `Prescription`, `MedicalRestrictions`, `FoodPreferences`, `PracticalConstraints`, `Feeding`), plus `RestrictionContradiction` |
| `validation.ts` | `validateFoodRestrictions` — flags ingredients that are both an absolute exclusion and a stated preference |
| `index.ts` | Barrel export |
| `validation.test.ts` | Test suite (Vitest) |

## Design notes

- **Absolute exclusion always wins.** `validateFoodRestrictions` never drops an ingredient
  from either list itself — it only reports the conflict, exactly like
  `reconcilePrescription` in `packages/calculation` returns an `inconsistencyWarning`
  instead of silently picking a value. The wizard is responsible for blocking progression
  on a non-empty result (see CLAUDE.md's "nothing auto-advances" principle).
- **A medical limit caps a preference, it doesn't lose to it.** `foodsToLimit` and
  `preferred`/`acceptable` are allowed to overlap, so `validateFoodRestrictions`
  deliberately doesn't check `foodsToLimit` — there's nothing invalid to flag there.
  That rule instead constrains how the recipe engine uses quantity, not the schema.
- **No dependency on `packages/calculation`.** Kept dependency-free like that package,
  even though both are ultimately consumed by the same wizard — this stays a pure
  data-shape + validation module.
