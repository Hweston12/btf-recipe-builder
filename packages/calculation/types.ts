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
