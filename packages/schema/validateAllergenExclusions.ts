import {
  allergenLabel,
  allergensFromRestrictions,
  findCatalogItemByName,
  type Allergen,
} from "./foodCatalog";
import { FoodPreferences, MedicalRestrictions, RestrictionContradiction } from "./types";

/**
 * The catalog-aware half of the "absolute exclusion always wins" rule
 * (architecture-plan.md §4, rule 1).
 *
 * validateFoodRestrictions catches an exclusion and a preference that are the
 * same *string*. This catches the case that matters more in practice: a
 * declared allergy and a preferred food that *contains* that allergen under a
 * different name — "Peanuts" excluded on step 3, "Peanut butter" hearted on
 * step 4. The two are complementary and both run; neither supersedes the other.
 *
 * Foods not in FOOD_CATALOG (free-text "Other" entries) are skipped rather
 * than flagged: we have no allergen data for them, and guessing from the name
 * would be exactly the kind of inference this project refuses to make
 * elsewhere. The wizard warns the user that custom foods aren't allergen-checked.
 *
 * Reports only — like validateFoodRestrictions, it never edits either list.
 */
export function validateAllergenExclusions(
  restrictions: MedicalRestrictions,
  preferences: FoodPreferences
): RestrictionContradiction[] {
  const allergens = allergensFromRestrictions(restrictions);
  if (allergens.length === 0) return [];

  const declared = new Set<Allergen>(allergens);
  const contradictions: RestrictionContradiction[] = [];

  for (const [listName, foods] of [
    ["preferred", preferences.preferred],
    ["acceptable", preferences.acceptable],
  ] as const) {
    for (const food of foods) {
      const item = findCatalogItemByName(food);
      if (!item) continue;

      const conflicting = item.allergens.filter((allergen) => declared.has(allergen));
      if (conflicting.length === 0) continue;

      contradictions.push({
        ingredient: food,
        reason: `"${item.name}" contains ${formatAllergens(conflicting)} but is marked ${listName}. A medical exclusion always wins — resolve this contradiction before continuing.`,
      });
    }
  }

  return contradictions;
}

function formatAllergens(allergens: Allergen[]): string {
  const labels = allergens.map((allergen) =>
    allergen === "gluten" ? "gluten" : allergenLabel(allergen).toLowerCase()
  );

  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
