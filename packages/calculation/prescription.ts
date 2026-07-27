import {
  PrescriptionInput,
  PrescriptionResult,
  DEFAULT_CONSISTENCY_TOLERANCE_PERCENT,
} from "./types";

/**
 * Relationship: caloriesKcal = finalVolumeMl * densityKcalPerMl
 *
 * Given any two of {caloriesKcal, finalVolumeMl, densityKcalPerMl}, calculates the third.
 * If all three are provided, checks that they agree within tolerance and returns a
 * warning (rather than throwing) if they don't — the wizard should surface this to
 * the user rather than silently pick one value.
 */
export function reconcilePrescription(
  input: PrescriptionInput,
  tolerancePercent: number = DEFAULT_CONSISTENCY_TOLERANCE_PERCENT
): PrescriptionResult {
  const { caloriesKcal, finalVolumeMl, densityKcalPerMl } = input;
  const providedCount = [caloriesKcal, finalVolumeMl, densityKcalPerMl].filter(
    (v) => v !== undefined && v !== null
  ).length;

  if (providedCount < 2) {
    throw new Error(
      "reconcilePrescription requires at least two of: caloriesKcal, finalVolumeMl, densityKcalPerMl"
    );
  }

  for (const [key, val] of Object.entries({ caloriesKcal, finalVolumeMl, densityKcalPerMl })) {
    if (val !== undefined && val <= 0) {
      throw new Error(`${key} must be a positive number, received ${val}`);
    }
  }

  // All three provided — check consistency, don't silently overwrite anything.
  if (providedCount === 3) {
    const expectedCalories = finalVolumeMl! * densityKcalPerMl!;
    const percentOff = (Math.abs(expectedCalories - caloriesKcal!) / caloriesKcal!) * 100;

    return {
      caloriesKcal: caloriesKcal!,
      finalVolumeMl: finalVolumeMl!,
      densityKcalPerMl: densityKcalPerMl!,
      calculatedField: "none",
      inconsistencyWarning:
        percentOff > tolerancePercent
          ? `Entered values are inconsistent: ${finalVolumeMl} mL x ${densityKcalPerMl} kcal/mL = ${expectedCalories.toFixed(
              1
            )} kcal, but ${caloriesKcal} kcal was entered directly (${percentOff.toFixed(
              1
            )}% difference, tolerance is ${tolerancePercent}%).`
          : undefined,
    };
  }

  // Exactly two provided — calculate the third.
  if (caloriesKcal === undefined) {
    return {
      caloriesKcal: round(finalVolumeMl! * densityKcalPerMl!, 1),
      finalVolumeMl: finalVolumeMl!,
      densityKcalPerMl: densityKcalPerMl!,
      calculatedField: "caloriesKcal",
    };
  }

  if (finalVolumeMl === undefined) {
    return {
      caloriesKcal: caloriesKcal!,
      finalVolumeMl: round(caloriesKcal! / densityKcalPerMl!, 1),
      densityKcalPerMl: densityKcalPerMl!,
      calculatedField: "finalVolumeMl",
    };
  }

  // densityKcalPerMl === undefined
  return {
    caloriesKcal: caloriesKcal!,
    finalVolumeMl: finalVolumeMl!,
    densityKcalPerMl: round(caloriesKcal! / finalVolumeMl!, 3),
    calculatedField: "densityKcalPerMl",
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
