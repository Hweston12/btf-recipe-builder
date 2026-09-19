/**
 * Shared types for the BTF Recipe Builder calculation module.
 * This module is intentionally free of any AI/LLM dependency —
 * every function here is pure, deterministic math.
 */

/** Tolerance used when checking whether user-entered values agree with each other. */
export const DEFAULT_CONSISTENCY_TOLERANCE_PERCENT = 5;

/** Tolerance used when checking measured/verified density against the target. */
export const DEFAULT_DENSITY_TOLERANCE_PERCENT = 10;

export interface PrescriptionInput {
  /** Total daily (or per-batch) calories, in kcal. */
  caloriesKcal?: number;
  /** Target final blended volume, in mL. */
  finalVolumeMl?: number;
  /** Target caloric density, in kcal/mL. */
  densityKcalPerMl?: number;
}

export interface PrescriptionResult {
  caloriesKcal: number;
  finalVolumeMl: number;
  densityKcalPerMl: number;
  /** Which field was calculated rather than user-entered. */
  calculatedField: "caloriesKcal" | "finalVolumeMl" | "densityKcalPerMl" | "none";
  /** Present only if all three values were entered and they don't agree within tolerance. */
  inconsistencyWarning?: string;
}

export interface WaterTopUpInput {
  /** The final volume the recipe is targeting, in mL. */
  targetFinalVolumeMl: number;
  /** The volume actually measured after the first blend, in mL. */
  currentBlendedVolumeMl: number;
}

export interface WaterTopUpResult {
  /** How much water (mL) to add to reach the target. 0 if already at/over target. */
  waterToAddMl: number;
  status: "add-water" | "at-target" | "already-over-target";
  note: string;
}

export interface VerifiedDensityInput {
  /** Total calories in the recipe as actually prepared, in kcal. */
  totalCalories: number;
  /** The final volume as actually measured after topping up with water, in mL. */
  measuredFinalVolumeMl: number;
  /** The originally prescribed target density, in kcal/mL. */
  targetDensityKcalPerMl: number;
  /** Optional override for the acceptable deviation, as a percent. */
  tolerancePercent?: number;
}

export interface VerifiedDensityResult {
  verifiedDensityKcalPerMl: number;
  percentDeviationFromTarget: number;
  withinTolerance: boolean;
  note: string;
}

/**
 * IDDSI framework levels relevant to a syringe-flow-tested liquid/semi-liquid.
 * Level 4 (extremely thick / pureed) is not reliably distinguishable with the
 * gravity syringe test alone — the IDDSI framework uses a separate fork-drip
 * test for that level, so it is flagged rather than asserted here.
 */
export type IddsiLevel = 0 | 1 | 2 | 3 | 4;

export interface IddsiFlowTestInput {
  /** Volume (mL) remaining in a 10 mL syringe after 10 seconds of gravity flow. */
  remainingVolumeMl: number;
  /** Syringe size used for the test; the IDDSI standard test uses 10 mL. */
  syringeVolumeMl?: number;
}

export interface IddsiFlowTestResult {
  level: IddsiLevel;
  levelName: string;
  /** True only when the syringe test itself can confirm this level with confidence. */
  confirmedBySyringeTest: boolean;
  note: string;
}

/**
 * The 28 vitamins/minerals NIH's Dietary Reference Intakes cover — the full set required
 * to check a sole-source (tube feeding) formula for nutritional adequacy, not just the
 * handful shown on a typical food label. Keys are camelCase + unit suffix, matching the
 * caloriesKcal-style convention used elsewhere in this package.
 */
export const MICRONUTRIENT_IDS = [
  "vitaminCMg",
  "thiaminMg",
  "riboflavinMg",
  "niacinMg",
  "vitaminB6Mg",
  "folateMcgDfe",
  "vitaminB12Mcg",
  "biotinMcg",
  "pantothenicAcidMg",
  "vitaminAMcgRae",
  "vitaminDMcg",
  "vitaminEMg",
  "vitaminKMcg",
  "calciumMg",
  "phosphorusMg",
  "magnesiumMg",
  "sodiumMg",
  "potassiumMg",
  "chlorideMg",
  "ironMg",
  "zincMg",
  "copperMcg",
  "manganeseMg",
  "iodineMcg",
  "seleniumMcg",
  "chromiumMcg",
  "molybdenumMcg",
  "fluorideMg",
] as const;

export type MicronutrientId = (typeof MICRONUTRIENT_IDS)[number];

/** A recipe's estimated content of all 28 nutrients, in the units MICRONUTRIENT_UNITS defines. */
export type MicronutrientEstimates = Record<MicronutrientId, number>;

/**
 * Age/sex life-stage bands used by NIH's DRI tables. Ages under 1 year use per-kilogram
 * Adequate Intakes that don't fit this per-recipe percent-of-DRI model, so resolveLifeStageGroup
 * deliberately throws rather than guessing a band for that range.
 */
export type LifeStageGroup =
  | "children-1-3"
  | "children-4-8"
  | "male-9-13"
  | "female-9-13"
  | "male-14-18"
  | "female-14-18"
  | "male-19-30"
  | "female-19-30"
  | "male-31-50"
  | "female-31-50"
  | "male-51-70"
  | "female-51-70"
  | "male-71-plus"
  | "female-71-plus";

/** One nutrient's DRI (RDA/AI) and Tolerable Upper Intake Level. ul is null when NIH has not
 * established one for that nutrient (e.g. potassium, several B vitamins) — in that case a
 * recipe can never be flagged as exceeding it, no matter how high the estimate. */
export interface NutrientTarget {
  dri: number;
  ul: number | null;
}

export interface MicronutrientAnalysisInput {
  /** The recipe's AI-estimated content of all 28 nutrients. */
  estimates: MicronutrientEstimates;
  ageYears: number;
  sexForDri: "male" | "female";
  /** The user's chosen minimum, e.g. 80 (Prescription.micronutrientMinimumPercentDri). */
  goalPercentDri: number;
  /** Prescription.doNotExceedUl — when false, no nutrient is ever flagged as exceeding its UL. */
  doNotExceedUl: boolean;
}

export interface MicronutrientAnalysisEntry {
  id: MicronutrientId;
  label: string;
  unit: string;
  estimatedAmount: number;
  driTarget: number;
  percentOfDri: number;
  meetsGoal: boolean;
  ulTarget: number | null;
  exceedsUl: boolean;
  /** Set only when there's something to flag: below goal, exceeds UL, or no UL established. */
  note?: string;
}

export interface MicronutrientAnalysisResult {
  lifeStageGroup: LifeStageGroup;
  goalPercentDri: number;
  entries: MicronutrientAnalysisEntry[];
  allMeetGoal: boolean;
  anyExceedsUl: boolean;
}
