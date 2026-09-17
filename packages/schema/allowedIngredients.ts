import {
  allergensFromRestrictions,
  FOOD_CATALOG,
  type FoodCatalogItem,
} from "./foodCatalog";
import type { FoodPreferences, MedicalRestrictions } from "./types";

/**
 * The actual constrained ingredient pool for one patient — the concrete set a
 * recipe engine (AI or otherwise) is allowed to choose from. This is the
 * "pre-approved pool" CLAUDE.md's constrained-generation rule refers to:
 * nothing outside these three buckets may ever appear in a generated recipe.
 *
 * `neutral` foods are foods the family expressed no opinion on. Step 4's own
 * copy promises the engine may still reach for them to meet a nutrition
 * target ("Anything left unrated is treated as 'no opinion' ... the recipe
 * engine may still use it"), so they're part of the allowed pool, just not
 * prioritized the way `preferred` is.
 */
export interface AllowedIngredientPool {
  preferred: FoodCatalogItem[];
  acceptable: FoodCatalogItem[];
  neutral: FoodCatalogItem[];
}

/**
 * Builds the allowed pool for one patient: every FOOD_CATALOG item except
 * ones ruled out by a declared allergy/gluten-free flag or a taste exclusion,
 * bucketed by how the family rated it.
 *
 * A food that is both excluded (taste) and preferred is excluded — the same
 * precedence the wizard already enforces before this can be called with
 * contradictory input (Step 4 blocks Continue on any absolute-exclusion /
 * preference contradiction via validateFoodRestrictions and
 * validateAllergenExclusions), but this function stays defensive regardless
 * since it may be called by code that didn't run those checks.
 */
export function buildAllowedIngredientPool(
  medicalRestrictions: MedicalRestrictions,
  foodPreferences: FoodPreferences
): AllowedIngredientPool {
  const blockedAllergens = new Set(allergensFromRestrictions(medicalRestrictions));
  const excludedNames = new Set(foodPreferences.excluded.map(normalize));
  const preferredNames = new Set(foodPreferences.preferred.map(normalize));
  const acceptableNames = new Set(foodPreferences.acceptable.map(normalize));

  const pool: AllowedIngredientPool = { preferred: [], acceptable: [], neutral: [] };

  for (const category of FOOD_CATALOG) {
    for (const item of category.items) {
      if (item.allergens.some((allergen) => blockedAllergens.has(allergen))) continue;
      if (excludedNames.has(normalize(item.name))) continue;

      const normalizedName = normalize(item.name);
      if (preferredNames.has(normalizedName)) {
        pool.preferred.push(item);
      } else if (acceptableNames.has(normalizedName)) {
        pool.acceptable.push(item);
      } else {
        pool.neutral.push(item);
      }
    }
  }

  return pool;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
