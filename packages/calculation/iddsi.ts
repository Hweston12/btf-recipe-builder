import { IddsiFlowTestInput, IddsiFlowTestResult, IddsiLevel } from "./types";

const IDDSI_LEVEL_NAMES: Record<IddsiLevel, string> = {
  0: "Thin",
  1: "Slightly thick",
  2: "Mildly thick",
  3: "Moderately thick",
  4: "Extremely thick",
};

/**
 * Interprets the standard IDDSI gravity flow test: fill a 10 mL syringe (no
 * plunger), let it flow under gravity for 10 seconds, measure what's left.
 *
 * This function records/interprets a physically-performed test — it does NOT
 * predict flow behavior from ingredients. The app must never skip the actual
 * test and infer a level from the recipe contents alone.
 *
 * Level 4 cannot be confidently distinguished from "nothing flowed" using the
 * syringe test alone (IDDSI uses a separate fork-drip test for level 4), so a
 * fully-retained result is flagged as needing that follow-up check rather than
 * asserted as level 4.
 */
export function interpretIddsiFlowTest(input: IddsiFlowTestInput): IddsiFlowTestResult {
  const { remainingVolumeMl, syringeVolumeMl = 10 } = input;

  if (syringeVolumeMl !== 10) {
    throw new Error(
      "The standard IDDSI flow test is defined for a 10 mL syringe; results from other syringe sizes are not directly comparable to IDDSI thresholds."
    );
  }
  if (remainingVolumeMl < 0 || remainingVolumeMl > syringeVolumeMl) {
    throw new Error(`remainingVolumeMl must be between 0 and ${syringeVolumeMl}`);
  }

  if (remainingVolumeMl === 0) {
    return {
      level: 0,
      levelName: IDDSI_LEVEL_NAMES[0],
      confirmedBySyringeTest: true,
      note: "All 10 mL flowed through in 10 seconds — consistent with IDDSI Level 0 (thin).",
    };
  }
  if (remainingVolumeMl > 0 && remainingVolumeMl <= 4) {
    return {
      level: 1,
      levelName: IDDSI_LEVEL_NAMES[1],
      confirmedBySyringeTest: true,
      note: `${remainingVolumeMl} mL remained after 10 seconds — consistent with IDDSI Level 1 (slightly thick).`,
    };
  }
  if (remainingVolumeMl > 4 && remainingVolumeMl <= 8) {
    return {
      level: 2,
      levelName: IDDSI_LEVEL_NAMES[2],
      confirmedBySyringeTest: true,
      note: `${remainingVolumeMl} mL remained after 10 seconds — consistent with IDDSI Level 2 (mildly thick).`,
    };
  }
  if (remainingVolumeMl > 8 && remainingVolumeMl < 10) {
    return {
      level: 3,
      levelName: IDDSI_LEVEL_NAMES[3],
      confirmedBySyringeTest: true,
      note: `${remainingVolumeMl} mL remained after 10 seconds — consistent with IDDSI Level 3 (moderately thick).`,
    };
  }

  // remainingVolumeMl === 10: nothing flowed at all.
  return {
    level: 4,
    levelName: IDDSI_LEVEL_NAMES[4],
    confirmedBySyringeTest: false,
    note: "Nothing flowed through the syringe in 10 seconds. This suggests Level 4 (extremely thick) or higher, but the syringe flow test alone cannot confirm this — use the IDDSI fork-drip test to verify before proceeding, and reassess whether this consistency is appropriate for the prescribed tube size.",
  };
}

/**
 * Compares a measured IDDSI level against the recipe's target level.
 * Bolus tube feeding recipes are typically much thinner than swallow-safety
 * IDDSI targets (e.g. Level 2), so this is a straightforward equality/mismatch
 * check rather than a "safe if thinner" rule — a mismatch in either direction
 * should be surfaced.
 */
export function compareToTargetIddsiLevel(
  measuredLevel: IddsiLevel,
  targetLevel: IddsiLevel
): { matches: boolean; note: string } {
  if (measuredLevel === targetLevel) {
    return {
      matches: true,
      note: `Measured level (${measuredLevel}) matches the target level (${targetLevel}).`,
    };
  }
  return {
    matches: false,
    note: `Measured level (${measuredLevel}) does not match the target level (${targetLevel}). Consider adjusting water content and re-testing before use.`,
  };
}
