import {
  WaterTopUpInput,
  WaterTopUpResult,
  VerifiedDensityInput,
  VerifiedDensityResult,
  DEFAULT_DENSITY_TOLERANCE_PERCENT,
} from "./types";

/**
 * After the first blend (ingredients + some water), the measured volume is
 * usually less than the target final volume. This calculates how much more
 * water to add to hit the target exactly.
 *
 * Assumes 1 mL of added water ≈ negligible additional volume loss — i.e. this
 * is a simple subtraction, not a density-aware mixing calculation. That's an
 * intentional simplification; note it if we ever need higher precision.
 */
export function calculateWaterTopUp(input: WaterTopUpInput): WaterTopUpResult {
  const { targetFinalVolumeMl, currentBlendedVolumeMl } = input;

  if (targetFinalVolumeMl <= 0 || currentBlendedVolumeMl < 0) {
    throw new Error("targetFinalVolumeMl must be positive and currentBlendedVolumeMl must be non-negative");
  }

  const difference = targetFinalVolumeMl - currentBlendedVolumeMl;

  if (difference > 0) {
    return {
      waterToAddMl: Math.round(difference * 10) / 10,
      status: "add-water",
      note: `Add approximately ${Math.round(difference * 10) / 10} mL of water to reach the target final volume of ${targetFinalVolumeMl} mL.`,
    };
  }

  if (difference === 0) {
    return {
      waterToAddMl: 0,
      status: "at-target",
      note: "The blended volume already matches the target final volume.",
    };
  }

  return {
    waterToAddMl: 0,
    status: "already-over-target",
    note: `The blended volume (${currentBlendedVolumeMl} mL) already exceeds the target (${targetFinalVolumeMl} mL) by ${Math.abs(
      difference
    ).toFixed(1)} mL. Do not add more water — this will dilute the recipe below its target density. Consider reviewing ingredient quantities.`,
  };
}

/**
 * After topping up to the measured final volume, recalculates the *actual*
 * caloric density delivered — this is what should be compared to the target,
 * not the originally planned density.
 */
export function calculateVerifiedDensity(input: VerifiedDensityInput): VerifiedDensityResult {
  const {
    totalCalories,
    measuredFinalVolumeMl,
    targetDensityKcalPerMl,
    tolerancePercent = DEFAULT_DENSITY_TOLERANCE_PERCENT,
  } = input;

  if (totalCalories <= 0 || measuredFinalVolumeMl <= 0 || targetDensityKcalPerMl <= 0) {
    throw new Error("totalCalories, measuredFinalVolumeMl, and targetDensityKcalPerMl must all be positive");
  }

  const verifiedDensityKcalPerMl = totalCalories / measuredFinalVolumeMl;
  const percentDeviationFromTarget =
    ((verifiedDensityKcalPerMl - targetDensityKcalPerMl) / targetDensityKcalPerMl) * 100;
  const withinTolerance = Math.abs(percentDeviationFromTarget) <= tolerancePercent;

  return {
    verifiedDensityKcalPerMl: Math.round(verifiedDensityKcalPerMl * 1000) / 1000,
    percentDeviationFromTarget: Math.round(percentDeviationFromTarget * 10) / 10,
    withinTolerance,
    note: withinTolerance
      ? `Verified density (${verifiedDensityKcalPerMl.toFixed(2)} kcal/mL) is within ${tolerancePercent}% of the target (${targetDensityKcalPerMl} kcal/mL).`
      : `Verified density (${verifiedDensityKcalPerMl.toFixed(2)} kcal/mL) is ${Math.abs(
          percentDeviationFromTarget
        ).toFixed(1)}% ${percentDeviationFromTarget > 0 ? "above" : "below"} the target (${targetDensityKcalPerMl} kcal/mL) — outside the ${tolerancePercent}% tolerance. Consider reviewing the recipe or measurement.`,
  };
}
