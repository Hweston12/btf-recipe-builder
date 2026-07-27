import { MedicalRestrictions, FoodPreferences, RestrictionContradiction } from "./types";

/**
 * Checks the "absolute exclusion always wins" precedence rule
 * (architecture-plan.md §4, rule 1): an ingredient in absoluteExclusions
 * must never also appear in preferred or acceptable. That's a contradiction
 * the wizard must flag and force the user to resolve — this function only
 * reports it, it never silently drops the ingredient from either list.
 *
 * Deliberately does not check foodsToLimit: rule 2 says a medical limit
 * caps a preference rather than losing to it, so overlap there is expected
 * and not a contradiction.
 *
 * Matching is case- and whitespace-insensitive (" Peanut" and "peanut" are
 * the same ingredient) so inconsistent capitalization doesn't hide a real
 * conflict.
 */
export function validateFoodRestrictions(
  restrictions: MedicalRestrictions,
  preferences: FoodPreferences
): RestrictionContradiction[] {
  const contradictions: RestrictionContradiction[] = [];

  for (const excludedIngredient of restrictions.absoluteExclusions) {
    const normalizedExcluded = normalize(excludedIngredient);

    if (preferences.preferred.some((food) => normalize(food) === normalizedExcluded)) {
      contradictions.push({
        ingredient: excludedIngredient,
        reason: `"${excludedIngredient}" is listed in absolute_exclusions but also marked preferred. An absolute exclusion always wins — resolve this contradiction before continuing.`,
      });
    }

    if (preferences.acceptable.some((food) => normalize(food) === normalizedExcluded)) {
      contradictions.push({
        ingredient: excludedIngredient,
        reason: `"${excludedIngredient}" is listed in absolute_exclusions but also marked acceptable. An absolute exclusion always wins — resolve this contradiction before continuing.`,
      });
    }
  }

  return contradictions;
}

function normalize(ingredient: string): string {
  return ingredient.trim().toLowerCase();
}
