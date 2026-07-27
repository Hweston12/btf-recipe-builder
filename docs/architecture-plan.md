# BTF Recipe Builder — System Architecture & Planning Doc

*Working draft — v0.1*

## 1. Purpose

A **calculator tool**, used directly by patients, families, and caregivers, that helps build nutritionally complete, individualized blenderized tube feeding (BTF) recipes at home. No accounts, no clinician login, no patient records stored — this is a stateless calculation and recipe-drafting tool, not a clinical records system.

**Scope note (v0.1 → v0.2 change):** originally scoped as a clinician-facing decision-support tool. Now scoped as a consumer-facing calculator. This shifts where the safety net has to live: with no clinician in the loop by default, the tool itself has to carry the disclaimers and safety checkpoints that a clinician would otherwise provide. See section 2 and section 7.

## 2. Design principles (non-negotiable)

- **Structured input over free text.** The AI never sees an open prompt from the user; it receives a validated JSON object built from the wizard.
- **Constrained generation.** Recipes are built only from the approved ingredient pool defined in step 3 of the wizard — the model can't introduce a food that wasn't cleared.
- **No IDDSI prediction from ingredients.** Texture/viscosity must always be confirmed with a physical 10-second syringe flow test — this is a hard rule, not a UX suggestion.
- **Clear, persistent "not a substitute for medical guidance" framing.** Because there's no clinician gate by default, the tool should visibly and repeatedly encourage users to review any recipe — especially the calorie/macro/micronutrient targets and any allergy/restriction settings — with their physician or registered dietitian before use, particularly for infants, medically fragile patients, or any recipe change.
- **No persistent patient data.** Nothing about the patient (name, diagnosis, weight, etc.) is stored server-side beyond what's needed to render the current session's calculation. If we add "save my recipe" later, that's a deliberate, opt-in decision, not a default.
- **Cost of a wrong assumption is high.** Every safety-relevant step (finalizing a recipe, confirming the IDDSI flow test was actually performed) requires an explicit user action; nothing auto-advances or auto-confirms.

## 3. High-level architecture

**Six-stage pipeline** (see diagram above):

1. **Intake wizard** — five-step clinician-guided form (not a chat interface)
2. **Structured data schema** — the JSON object below; single source of truth for everything downstream
3. **Recipe generation** — AI drafts 2–3 candidate recipes from the constrained ingredient pool
4. **Nutrient validation** — AI-estimated values shown immediately; Cronometer Pro path runs in parallel/afterward for verified values
5. **Clinical review pipeline** — status object moves through defined states; nothing is "final" until clinician-approved
6. **Caregiver output** — plain-language recipe card + prep/safety instructions, generated only from the approved recipe

### Suggested layered structure

| Layer | Responsibility | Notes |
|---|---|---|
| **Frontend** | 5-step wizard, validation dashboard, recipe cards | Plain language throughout — audience is families, not clinicians. React/Next.js is a reasonable default |
| **API layer** | Validates and normalizes wizard input into the schema; orchestrates calls to the recipe engine | Should reject/flag inconsistent prescriptions server-side, not just client-side |
| **Recipe engine** | Wraps the LLM call; enforces ingredient-pool constraint; returns structured candidate recipes, not prose | Keep prompt construction server-side, versioned, and testable independent of the UI |
| **Calculation module** | Deterministic math: final volume, water top-up, verified density, IDDSI-test result recording | Pure functions, no AI — this is the part we can fully unit test |
| **Nutrient data layer** | Holds AI-estimated nutrient values for the current session | No verified/clinician-entered tier for now — see section 6 |
| **Status/workflow engine** | Tracks a lightweight state (draft → nutrient-checked → volume-confirmed → IDDSI-tested) within the session | Still enforces "don't call it done until the physical steps happened" — just no clinician approval gate by default |

No persistence layer, no accounts, no patient records. If a "save/export my recipe" feature is added later, treat it as local (client-side / downloadable file) rather than server-stored, unless there's a clear reason to change that.

## 4. Core data schema

Adapted directly from the proposal, this is the object the wizard produces and everything downstream consumes:

```json
{
  "patient": { "age_years": 8, "sex_for_dri": "female", "weight_kg": 28 },
  "prescription": {
    "calories_kcal": 1400,
    "final_volume_ml": 1000,
    "target_density_kcal_ml": 1.4,
    "feeds_per_day": 4,
    "iddsi_target": 2,
    "macro_targets": { "carbohydrate_percent": [45, 55], "fat_percent": [30, 40], "protein_percent": [10, 20] },
    "micronutrient_minimum_percent_dri": 80,
    "do_not_exceed_ul": true
  },
  "medical_restrictions": {
    "absolute_exclusions": ["peanut"],
    "gluten_free": true,
    "foods_to_limit": ["high sodium broth"]
  },
  "food_preferences": {
    "preferred": ["chicken", "oats", "banana", "blueberries", "spinach", "yogurt", "olive oil"],
    "acceptable": ["rice", "beans", "sweet potato", "avocado"],
    "use_sparingly": ["juice"],
    "excluded": ["fish", "tofu"]
  },
  "practical_constraints": {
    "maximum_ingredients": 10,
    "budget_level": "moderate",
    "blender_type": "high-powered",
    "preparation_frequency": "daily",
    "cuisine_preferences": ["American", "Mediterranean"]
  },
  "feeding": { "route": "gastrostomy", "tube_size_fr": 14, "delivery": "bolus", "history_of_clogging": false }
}
```

**Resolved:** `medical_restrictions` keeps two arrays — `absolute_exclusions` and `foods_to_limit` — not three. A third `disliked_but_permitted` array was considered and dropped as redundant with `food_preferences.acceptable`.

The gap that actually mattered wasn't a missing field, it was precedence: nothing said what happens when the same ingredient appears in both `medical_restrictions` and `food_preferences`. Two rules are now locked in, and the recipe engine (§5) and the wizard both have to honor them:

1. **Absolute exclusion always wins.** An ingredient in `absolute_exclusions` must never appear in a generated recipe, no matter what `food_preferences` says about it — including if it's marked `preferred`. If a wizard user marks the same food `preferred` in step 4 after excluding it in step 3, that's a contradiction the wizard must flag and force the user to resolve, not something the app silently resolves for them.
2. **A medical limit caps a taste preference, it doesn't lose to it.** An ingredient in `foods_to_limit` can still be used even if it's also `preferred` — the medical restriction constrains quantity, and how much the family likes the food has no bearing on that cap.

## 5. Recipe generation

The recipe engine turns the structured object into a constrained prompt (already drafted in the source proposal) and returns candidates as structured data — ingredient name, gram weight, calories, macro breakdown, fiber, fluid contribution — not paragraphs. Each candidate should carry:

- `source: "ai_generated"` (kept for provenance even without a clinician-edit tier for now)
- a list of nutrients that are estimated rather than lab/database-verified
- an explicit flag that it has **not** been validated for IDDSI level, and a prompt to perform the physical flow test before use

## 6. Nutrient validation & Cronometer Pro — deferred

Not building Cronometer integration for now. In this version, nutrient values are **AI-estimated only**, and the UI should say so plainly next to every number (e.g. "estimated — not a substitute for a verified nutrient analysis"). If a nutrient database or third-party verification is added later, it's a separate future phase; don't design the schema to assume it's coming, but keep `ai_estimated_values` as a clearly-labeled field so a `verified_values` field could be added without a rework.

## 7. Status pipeline (the safety backbone)

Reworked for a user without a clinician gate — the point isn't approval by a third party, it's making sure the physical, real-world checks actually happened before the recipe is treated as usable:

```
Draft generated → Nutrient estimate reviewed → Volume confirmed → IDDSI flow test completed
```

Each step requires an explicit "I did this" confirmation from the user — the app should not let someone silently skip past "I performed the IDDSI flow test" while still labeling the recipe as ready to feed. The UI copy at the final step should reiterate: check with your physician or dietitian before starting or changing a tube feeding regimen.

## 8. Calculation module scope (deterministic, non-AI)

1. Planned final volume from calories + target caloric density
2. Water top-up needed after first blend
3. Verified caloric density from measured final volume
4. IDDSI level recording from a physical 10-second syringe flow test result

This module is fully unit-testable and has no AI dependency — good candidate for building and validating first.

## 9. Resolved decisions

- **Users:** patients, families, and caregivers directly — not gated behind a clinician login. Language, defaults, and error messages should be written for a general audience, not clinical shorthand.
- **Patient data:** none stored server-side. Session-only.
- **Cronometer:** out of scope for now. Nutrient values are AI-estimated and labeled as such.

## Still open

- **Single recipe vs. rotating multi-day recipes.** Recommend starting with a **single recipe per build** for v1 — it's simpler to reason about nutritionally, simpler to validate, and covers the most common real-world case (many families use one base recipe daily). Rotation adds real complexity: nutrient targets have to be met on average across days rather than per-recipe, which changes the validation logic meaningfully. Suggest treating multi-day rotation as a Phase 2+ feature once the single-recipe flow is solid — but flag if you'd rather design the schema to support rotation from day one so we don't have to retrofit it later.

## 10. Suggested phased roadmap

- **Phase 1 (MVP):** Wizard steps 1–3, structured schema, calculation module, AI recipe generation (single recipe), AI-estimated nutrient display, lightweight status pipeline with explicit user confirmations.
- **Phase 2:** Validation dashboard (green/yellow/red/purple), printable recipe output, IDDSI test recording and reminders.
- **Phase 3:** Multi-day recipe rotation, "foods already in the house" optimization mode.
- **Later / not currently planned:** Cronometer or other nutrient-database integration, accounts/saved recipes, clinician-facing mode.

---

*Next: pick a piece from section 8–10 to build out in detail — the calculation module is the most self-contained starting point.*

## 11. System workflow outline

The wizard steps map directly onto the schema and the pipeline. Each step has a clear input, a clear output, and a clear "what could go wrong here" check.

**Step 1 — Nutrition basics**
- User enters: age, weight, sex (for DRI calc), and two of {daily calories, target volume, target density} — the app calculates the third.
- App checks: flags inconsistent numbers (e.g. calories + volume + density that don't mathematically agree).
- Output: `patient` + core of `prescription`.

**Step 2 — Feeding setup**
- User enters: tube type/size, feeds per day, bolus vs. pump, desired IDDSI level.
- Output: `feeding` + rest of `prescription`.

**Step 3 — Safety & restrictions**
- User enters: allergies (checkbox + "other"), medical restrictions (celiac, renal, low-fiber, etc.), and marks each as **absolute exclusion**, **limit**, or **disliked but permitted**.
- App checks: nothing here is optional to skip — this gates what step 4 can offer.
- Output: `medical_restrictions`.

**Step 4 — Food preferences**
- User picks a dietary pattern (omnivorous, vegetarian, etc.), then rates foods by category (protein, grains, fruit, veg, fat, liquid) as preferred / acceptable / use sparingly / exclude, plus free-text "other foods."
- User also sets practical constraints: budget, blender type, max ingredients, prep frequency.
- Output: `food_preferences` + `practical_constraints`.

**Step 5 — Generate & review**
- App sends the full structured object to the recipe engine.
- Recipe engine returns 2–3 candidate recipes, each with ingredient list (grams), estimated calories/macros/fiber/fluid, and a flagged "estimated, not verified" nutrient panel.
- User picks one, sees a plain-language checklist:
  1. ✅ Review the estimated nutrition — does this look right to you?
  2. ✅ Blend, measure to final volume, confirm actual yield matches target
  3. ✅ Perform the physical IDDSI flow test — do not skip this
  4. ⤷ Reminder: check with your physician or dietitian before starting or changing a tube feeding regimen
- Output: printable recipe card + prep instructions, with the estimate/verification distinction preserved.

## 12. Example walkthrough: a user's session

**Persona:** Maria is the mother of Diego, age 6, who has a gastrostomy tube and a dairy allergy. Their pediatrician recommended trying blenderized feeds instead of only formula. Maria has no clinical background — she wants a safe starting recipe she can make in her kitchen.

**Step 1 — Nutrition basics**
Maria enters: Diego's age (6), weight (20 kg), sex (male). She knows his daily calorie goal from his care team: 1,200 kcal. She enters that plus a target final volume of 900 mL. The app calculates the resulting density (1.33 kcal/mL) and shows it back to her: *"This works out to about 1.33 kcal per mL — does that match what your care team recommended?"* No inconsistency flagged.

**Step 2 — Feeding setup**
Maria selects: gastrostomy tube, 16 Fr, 5 feeds/day, bolus delivery, and IDDSI Level 2 (per her care team's note).

**Step 3 — Safety & restrictions**
Maria checks "Milk" under allergies — this is an **absolute exclusion**. She also notes Diego has mild reflux, which the app logs as a tolerance flag (not an exclusion) to avoid over-restricting later.

**Step 4 — Food preferences**
Dietary pattern: dairy-free (pre-selected based on the milk allergy, editable). Maria rates foods:
- Preferred: chicken, oats, banana, sweet potato, olive oil
- Acceptable: rice, avocado, spinach
- Use sparingly: apple juice (Diego likes it, but she's cautious about sugar)
- Excluded: nothing further beyond the allergy

Practical constraints: moderate budget, standard blender (not high-powered), max 8 ingredients, prepares fresh every 24 hours.

**Step 5 — Generate & review**
The app returns three candidate recipes. Maria picks Option 2: chicken, oats, banana, sweet potato, olive oil, water — 6 ingredients, matches her preferred-foods list closely. The screen shows:

- Estimated 1,205 kcal, 1.34 kcal/mL, macros within her target range
- Clearly labeled: *"These values are AI-estimated, not lab-verified — check with your dietitian if anything looks off."*
- A note that oats and banana together are usually well tolerated with reflux, but this is informational, not a guarantee

Maria confirms she reviewed the estimate, blends the recipe, measures the final yield (comes out to 890 mL — close enough, app suggests adding a small amount of water to hit 900 mL exactly), and performs the syringe flow test at home, confirming it flows appropriately for a 16 Fr tube. She checks off all three boxes. The app generates a printable recipe card with ingredient weights, prep steps, storage instructions, and a final reminder to share the recipe with Diego's care team before making it his regular feed.

---

*Next: pick a piece from section 8–10 to build out in detail — the calculation module is the most self-contained starting point.*
