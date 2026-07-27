/**
 * Shared types for the BTF Recipe Builder wizard intake schema.
 * Mirrors docs/architecture-plan.md §4 in camelCase, matching the convention
 * already used by packages/calculation. Dependency-free by design — same
 * reasoning as packages/calculation: this is a pure data-shape module with
 * no AI, no network calls, no framework coupling.
 */

export interface Patient {
  ageYears: number;
  sexForDri: "male" | "female";
  weightKg: number;
}

export interface MacroTargets {
  /** [min, max] as a percent of total calories. */
  carbohydratePercent: [number, number];
  fatPercent: [number, number];
  proteinPercent: [number, number];
}

export interface Prescription {
  caloriesKcal: number;
  finalVolumeMl: number;
  targetDensityKcalPerMl: number;
  feedsPerDay: number;
  /**
   * IDDSI level (0-4) the prescriber is targeting. This is a target set up
   * front, not a measured result — it must never be treated as equivalent to
   * a physically-performed flow test result (see packages/calculation/iddsi.ts).
   */
  iddsiTarget: number;
  macroTargets: MacroTargets;
  micronutrientMinimumPercentDri: number;
  doNotExceedUl: boolean;
}

export interface MedicalRestrictions {
  /**
   * Ingredients that must never appear in a generated recipe, regardless of
   * anything in FoodPreferences — see validateFoodRestrictions.
   */
  absoluteExclusions: string[];
  glutenFree: boolean;
  /**
   * Ingredients allowed but capped in quantity — a separate constraint from
   * FoodPreferences, not merged into a single preference score. A food can
   * be both foodsToLimit and preferred at once: the cap still applies.
   */
  foodsToLimit: string[];
}

export interface FoodPreferences {
  preferred: string[];
  acceptable: string[];
  useSparingly: string[];
  excluded: string[];
}

export interface PracticalConstraints {
  maximumIngredients: number;
  budgetLevel: string;
  blenderType: string;
  preparationFrequency: string;
  cuisinePreferences: string[];
}

export interface Feeding {
  route: string;
  tubeSizeFr: number;
  delivery: string;
  historyOfClogging: boolean;
}

/** The full object the wizard produces and everything downstream consumes. */
export interface PatientIntake {
  patient: Patient;
  prescription: Prescription;
  medicalRestrictions: MedicalRestrictions;
  foodPreferences: FoodPreferences;
  practicalConstraints: PracticalConstraints;
  feeding: Feeding;
}

/** A conflict found between medical_restrictions and food_preferences — see validateFoodRestrictions. */
export interface RestrictionContradiction {
  ingredient: string;
  reason: string;
}
