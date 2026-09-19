import {
  MICRONUTRIENT_IDS,
  LifeStageGroup,
  MicronutrientAnalysisEntry,
  MicronutrientAnalysisInput,
  MicronutrientAnalysisResult,
  MicronutrientId,
  NutrientTarget,
} from "./types";

export const MICRONUTRIENT_LABELS: Record<MicronutrientId, string> = {
  vitaminCMg: "Vitamin C",
  thiaminMg: "Thiamin (B1)",
  riboflavinMg: "Riboflavin (B2)",
  niacinMg: "Niacin (B3)",
  vitaminB6Mg: "Vitamin B6",
  folateMcgDfe: "Folate (B9)",
  vitaminB12Mcg: "Vitamin B12",
  biotinMcg: "Biotin (B7)",
  pantothenicAcidMg: "Pantothenic acid (B5)",
  vitaminAMcgRae: "Vitamin A",
  vitaminDMcg: "Vitamin D",
  vitaminEMg: "Vitamin E",
  vitaminKMcg: "Vitamin K",
  calciumMg: "Calcium",
  phosphorusMg: "Phosphorus",
  magnesiumMg: "Magnesium",
  sodiumMg: "Sodium",
  potassiumMg: "Potassium",
  chlorideMg: "Chloride",
  ironMg: "Iron",
  zincMg: "Zinc",
  copperMcg: "Copper",
  manganeseMg: "Manganese",
  iodineMcg: "Iodine",
  seleniumMcg: "Selenium",
  chromiumMcg: "Chromium",
  molybdenumMcg: "Molybdenum",
  fluorideMg: "Fluoride",
};

export const MICRONUTRIENT_UNITS: Record<MicronutrientId, string> = {
  vitaminCMg: "mg",
  thiaminMg: "mg",
  riboflavinMg: "mg",
  niacinMg: "mg",
  vitaminB6Mg: "mg",
  folateMcgDfe: "mcg DFE",
  vitaminB12Mcg: "mcg",
  biotinMcg: "mcg",
  pantothenicAcidMg: "mg",
  vitaminAMcgRae: "mcg RAE",
  vitaminDMcg: "mcg",
  vitaminEMg: "mg",
  vitaminKMcg: "mcg",
  calciumMg: "mg",
  phosphorusMg: "mg",
  magnesiumMg: "mg",
  sodiumMg: "mg",
  potassiumMg: "mg",
  chlorideMg: "mg",
  ironMg: "mg",
  zincMg: "mg",
  copperMcg: "mcg",
  manganeseMg: "mg",
  iodineMcg: "mcg",
  seleniumMcg: "mcg",
  chromiumMcg: "mcg",
  molybdenumMcg: "mcg",
  fluorideMg: "mg",
};

/**
 * Maps age + sex to one of NIH's standard DRI life-stage bands. Ages under 1 year use
 * per-kilogram Adequate Intakes that don't fit this per-recipe model — this function throws
 * rather than silently picking the youngest band, the same "throw on invalid input, never
 * guess" contract reconcilePrescription uses.
 */
export function resolveLifeStageGroup(ageYears: number, sexForDri: "male" | "female"): LifeStageGroup {
  if (!Number.isFinite(ageYears) || ageYears <= 0) {
    throw new Error(`ageYears must be a positive number, received ${ageYears}`);
  }
  if (ageYears < 1) {
    throw new Error(
      "DRI values below 1 year use per-kilogram Adequate Intakes, which this percent-of-DRI model doesn't support — resolveLifeStageGroup only covers ages 1 and up."
    );
  }
  if (ageYears < 4) return "children-1-3";
  if (ageYears < 9) return "children-4-8";
  if (ageYears < 14) return `${sexForDri}-9-13`;
  if (ageYears < 19) return `${sexForDri}-14-18`;
  if (ageYears < 31) return `${sexForDri}-19-30`;
  if (ageYears < 51) return `${sexForDri}-31-50`;
  if (ageYears < 71) return `${sexForDri}-51-70`;
  return `${sexForDri}-71-plus`;
}

/**
 * DRI (RDA/AI) and Tolerable Upper Intake Level for each of the 28 nutrients, by life-stage
 * band, compiled from the standard NIH/NASEM Dietary Reference Intake tables. `ul: null` means
 * NIH has not established a UL for that nutrient at that life stage (e.g. potassium, several
 * B vitamins) — such a nutrient can never be flagged as exceeding it, however high the estimate.
 *
 * These figures were compiled from general nutrition-science reference values, not transcribed
 * directly from the current NIH Office of Dietary Supplements tables in this session — before
 * relying on this for an actual patient, a clinician/dietitian should cross-check every cell
 * against the live NIH DRI tables. This mirrors how every other nutrient value in this app is
 * already labeled "estimated, not verified" (architecture-plan.md §6).
 *
 * Later bands are derived by spreading an earlier band and overriding only the nutrients that
 * actually change with age/sex, so every real difference between bands is visible in the diff
 * rather than buried in 14 fully-duplicated tables.
 */
const CHILDREN_1_3: Record<MicronutrientId, NutrientTarget> = {
  vitaminCMg: { dri: 15, ul: 400 },
  thiaminMg: { dri: 0.5, ul: null },
  riboflavinMg: { dri: 0.5, ul: null },
  niacinMg: { dri: 6, ul: 10 },
  vitaminB6Mg: { dri: 0.5, ul: 30 },
  folateMcgDfe: { dri: 150, ul: 300 },
  vitaminB12Mcg: { dri: 0.9, ul: null },
  biotinMcg: { dri: 8, ul: null },
  pantothenicAcidMg: { dri: 2, ul: null },
  vitaminAMcgRae: { dri: 300, ul: 600 },
  vitaminDMcg: { dri: 15, ul: 63 },
  vitaminEMg: { dri: 6, ul: 200 },
  vitaminKMcg: { dri: 30, ul: null },
  calciumMg: { dri: 700, ul: 2500 },
  phosphorusMg: { dri: 460, ul: 3000 },
  magnesiumMg: { dri: 80, ul: 65 },
  sodiumMg: { dri: 800, ul: 1200 },
  potassiumMg: { dri: 2000, ul: null },
  chlorideMg: { dri: 1500, ul: 2300 },
  ironMg: { dri: 7, ul: 40 },
  zincMg: { dri: 3, ul: 7 },
  copperMcg: { dri: 340, ul: 1000 },
  manganeseMg: { dri: 1.2, ul: 2 },
  iodineMcg: { dri: 90, ul: 200 },
  seleniumMcg: { dri: 20, ul: 90 },
  chromiumMcg: { dri: 11, ul: null },
  molybdenumMcg: { dri: 17, ul: 300 },
  fluorideMg: { dri: 0.7, ul: 1.3 },
};

const CHILDREN_4_8: Record<MicronutrientId, NutrientTarget> = {
  vitaminCMg: { dri: 25, ul: 650 },
  thiaminMg: { dri: 0.6, ul: null },
  riboflavinMg: { dri: 0.6, ul: null },
  niacinMg: { dri: 8, ul: 15 },
  vitaminB6Mg: { dri: 0.6, ul: 40 },
  folateMcgDfe: { dri: 200, ul: 400 },
  vitaminB12Mcg: { dri: 1.2, ul: null },
  biotinMcg: { dri: 12, ul: null },
  pantothenicAcidMg: { dri: 3, ul: null },
  vitaminAMcgRae: { dri: 400, ul: 900 },
  vitaminDMcg: { dri: 15, ul: 75 },
  vitaminEMg: { dri: 7, ul: 300 },
  vitaminKMcg: { dri: 55, ul: null },
  calciumMg: { dri: 1000, ul: 2500 },
  phosphorusMg: { dri: 500, ul: 3000 },
  magnesiumMg: { dri: 130, ul: 110 },
  sodiumMg: { dri: 1000, ul: 1500 },
  potassiumMg: { dri: 2300, ul: null },
  chlorideMg: { dri: 1900, ul: 2900 },
  ironMg: { dri: 10, ul: 40 },
  zincMg: { dri: 5, ul: 12 },
  copperMcg: { dri: 440, ul: 3000 },
  manganeseMg: { dri: 1.5, ul: 3 },
  iodineMcg: { dri: 90, ul: 300 },
  seleniumMcg: { dri: 30, ul: 150 },
  chromiumMcg: { dri: 15, ul: null },
  molybdenumMcg: { dri: 22, ul: 600 },
  fluorideMg: { dri: 1, ul: 2.2 },
};

const MALE_9_13: Record<MicronutrientId, NutrientTarget> = {
  vitaminCMg: { dri: 45, ul: 1200 },
  thiaminMg: { dri: 0.9, ul: null },
  riboflavinMg: { dri: 0.9, ul: null },
  niacinMg: { dri: 12, ul: 20 },
  vitaminB6Mg: { dri: 1.0, ul: 60 },
  folateMcgDfe: { dri: 300, ul: 600 },
  vitaminB12Mcg: { dri: 1.8, ul: null },
  biotinMcg: { dri: 20, ul: null },
  pantothenicAcidMg: { dri: 4, ul: null },
  vitaminAMcgRae: { dri: 600, ul: 1700 },
  vitaminDMcg: { dri: 15, ul: 100 },
  vitaminEMg: { dri: 11, ul: 600 },
  vitaminKMcg: { dri: 60, ul: null },
  calciumMg: { dri: 1300, ul: 3000 },
  phosphorusMg: { dri: 1250, ul: 4000 },
  magnesiumMg: { dri: 240, ul: 350 },
  sodiumMg: { dri: 1200, ul: 1800 },
  potassiumMg: { dri: 2500, ul: null },
  chlorideMg: { dri: 2300, ul: 3400 },
  ironMg: { dri: 8, ul: 40 },
  zincMg: { dri: 8, ul: 23 },
  copperMcg: { dri: 700, ul: 5000 },
  manganeseMg: { dri: 1.9, ul: 6 },
  iodineMcg: { dri: 120, ul: 600 },
  seleniumMcg: { dri: 40, ul: 280 },
  chromiumMcg: { dri: 25, ul: null },
  molybdenumMcg: { dri: 34, ul: 1100 },
  fluorideMg: { dri: 2, ul: 10 },
};

const FEMALE_9_13: Record<MicronutrientId, NutrientTarget> = {
  ...MALE_9_13,
  potassiumMg: { dri: 2300, ul: null },
  manganeseMg: { dri: 1.6, ul: 6 },
  chromiumMcg: { dri: 21, ul: null },
};

const MALE_14_18: Record<MicronutrientId, NutrientTarget> = {
  vitaminCMg: { dri: 75, ul: 1800 },
  thiaminMg: { dri: 1.2, ul: null },
  riboflavinMg: { dri: 1.3, ul: null },
  niacinMg: { dri: 16, ul: 30 },
  vitaminB6Mg: { dri: 1.3, ul: 80 },
  folateMcgDfe: { dri: 400, ul: 800 },
  vitaminB12Mcg: { dri: 2.4, ul: null },
  biotinMcg: { dri: 25, ul: null },
  pantothenicAcidMg: { dri: 5, ul: null },
  vitaminAMcgRae: { dri: 900, ul: 2800 },
  vitaminDMcg: { dri: 15, ul: 100 },
  vitaminEMg: { dri: 15, ul: 800 },
  vitaminKMcg: { dri: 75, ul: null },
  calciumMg: { dri: 1300, ul: 3000 },
  phosphorusMg: { dri: 1250, ul: 4000 },
  magnesiumMg: { dri: 410, ul: 350 },
  sodiumMg: { dri: 1500, ul: 2300 },
  potassiumMg: { dri: 3000, ul: null },
  chlorideMg: { dri: 2300, ul: 3600 },
  ironMg: { dri: 11, ul: 45 },
  zincMg: { dri: 11, ul: 34 },
  copperMcg: { dri: 890, ul: 8000 },
  manganeseMg: { dri: 2.2, ul: 9 },
  iodineMcg: { dri: 150, ul: 900 },
  seleniumMcg: { dri: 55, ul: 400 },
  chromiumMcg: { dri: 35, ul: null },
  molybdenumMcg: { dri: 43, ul: 1700 },
  fluorideMg: { dri: 3, ul: 10 },
};

const FEMALE_14_18: Record<MicronutrientId, NutrientTarget> = {
  ...MALE_14_18,
  vitaminCMg: { dri: 65, ul: 1800 },
  thiaminMg: { dri: 1.0, ul: null },
  riboflavinMg: { dri: 1.0, ul: null },
  niacinMg: { dri: 14, ul: 30 },
  vitaminB6Mg: { dri: 1.2, ul: 80 },
  vitaminAMcgRae: { dri: 700, ul: 2800 },
  vitaminKMcg: { dri: 75, ul: null },
  magnesiumMg: { dri: 360, ul: 350 },
  potassiumMg: { dri: 2300, ul: null },
  ironMg: { dri: 15, ul: 45 },
  zincMg: { dri: 9, ul: 34 },
  manganeseMg: { dri: 1.6, ul: 9 },
  chromiumMcg: { dri: 24, ul: null },
  fluorideMg: { dri: 2, ul: 10 },
};

const MALE_19_30: Record<MicronutrientId, NutrientTarget> = {
  vitaminCMg: { dri: 90, ul: 2000 },
  thiaminMg: { dri: 1.2, ul: null },
  riboflavinMg: { dri: 1.3, ul: null },
  niacinMg: { dri: 16, ul: 35 },
  vitaminB6Mg: { dri: 1.3, ul: 100 },
  folateMcgDfe: { dri: 400, ul: 1000 },
  vitaminB12Mcg: { dri: 2.4, ul: null },
  biotinMcg: { dri: 30, ul: null },
  pantothenicAcidMg: { dri: 5, ul: null },
  vitaminAMcgRae: { dri: 900, ul: 3000 },
  vitaminDMcg: { dri: 15, ul: 100 },
  vitaminEMg: { dri: 15, ul: 1000 },
  vitaminKMcg: { dri: 120, ul: null },
  calciumMg: { dri: 1000, ul: 2500 },
  phosphorusMg: { dri: 700, ul: 4000 },
  magnesiumMg: { dri: 400, ul: 350 },
  sodiumMg: { dri: 1500, ul: 2300 },
  potassiumMg: { dri: 3400, ul: null },
  chlorideMg: { dri: 2300, ul: 3600 },
  ironMg: { dri: 8, ul: 45 },
  zincMg: { dri: 11, ul: 40 },
  copperMcg: { dri: 900, ul: 10000 },
  manganeseMg: { dri: 2.3, ul: 11 },
  iodineMcg: { dri: 150, ul: 1100 },
  seleniumMcg: { dri: 55, ul: 400 },
  chromiumMcg: { dri: 35, ul: null },
  molybdenumMcg: { dri: 45, ul: 2000 },
  fluorideMg: { dri: 4, ul: 10 },
};

const FEMALE_19_30: Record<MicronutrientId, NutrientTarget> = {
  ...MALE_19_30,
  vitaminCMg: { dri: 75, ul: 2000 },
  thiaminMg: { dri: 1.1, ul: null },
  riboflavinMg: { dri: 1.1, ul: null },
  niacinMg: { dri: 14, ul: 35 },
  vitaminAMcgRae: { dri: 700, ul: 3000 },
  vitaminKMcg: { dri: 90, ul: null },
  magnesiumMg: { dri: 310, ul: 350 },
  potassiumMg: { dri: 2600, ul: null },
  ironMg: { dri: 18, ul: 45 },
  zincMg: { dri: 8, ul: 40 },
  manganeseMg: { dri: 1.8, ul: 11 },
  chromiumMcg: { dri: 25, ul: null },
  fluorideMg: { dri: 3, ul: 10 },
};

const MALE_31_50: Record<MicronutrientId, NutrientTarget> = {
  ...MALE_19_30,
  magnesiumMg: { dri: 420, ul: 350 },
};

const FEMALE_31_50: Record<MicronutrientId, NutrientTarget> = {
  ...FEMALE_19_30,
  magnesiumMg: { dri: 320, ul: 350 },
};

const MALE_51_70: Record<MicronutrientId, NutrientTarget> = {
  ...MALE_31_50,
  vitaminB6Mg: { dri: 1.7, ul: 100 },
  sodiumMg: { dri: 1300, ul: 2300 },
  chlorideMg: { dri: 2000, ul: 3600 },
  calciumMg: { dri: 1000, ul: 2000 },
  chromiumMcg: { dri: 30, ul: null },
};

const FEMALE_51_70: Record<MicronutrientId, NutrientTarget> = {
  ...FEMALE_31_50,
  vitaminB6Mg: { dri: 1.5, ul: 100 },
  ironMg: { dri: 8, ul: 45 },
  sodiumMg: { dri: 1300, ul: 2300 },
  chlorideMg: { dri: 2000, ul: 3600 },
  calciumMg: { dri: 1200, ul: 2000 },
  chromiumMcg: { dri: 20, ul: null },
};

const MALE_71_PLUS: Record<MicronutrientId, NutrientTarget> = {
  ...MALE_51_70,
  vitaminDMcg: { dri: 20, ul: 100 },
  calciumMg: { dri: 1200, ul: 2000 },
  phosphorusMg: { dri: 700, ul: 3000 },
  sodiumMg: { dri: 1200, ul: 2300 },
  chlorideMg: { dri: 1800, ul: 3400 },
};

const FEMALE_71_PLUS: Record<MicronutrientId, NutrientTarget> = {
  ...FEMALE_51_70,
  vitaminDMcg: { dri: 20, ul: 100 },
  phosphorusMg: { dri: 700, ul: 3000 },
  sodiumMg: { dri: 1200, ul: 2300 },
  chlorideMg: { dri: 1800, ul: 3400 },
};

const DRI_UL_TABLE: Record<LifeStageGroup, Record<MicronutrientId, NutrientTarget>> = {
  "children-1-3": CHILDREN_1_3,
  "children-4-8": CHILDREN_4_8,
  "male-9-13": MALE_9_13,
  "female-9-13": FEMALE_9_13,
  "male-14-18": MALE_14_18,
  "female-14-18": FEMALE_14_18,
  "male-19-30": MALE_19_30,
  "female-19-30": FEMALE_19_30,
  "male-31-50": MALE_31_50,
  "female-31-50": FEMALE_31_50,
  "male-51-70": MALE_51_70,
  "female-51-70": FEMALE_51_70,
  "male-71-plus": MALE_71_PLUS,
  "female-71-plus": FEMALE_71_PLUS,
};

/**
 * Compares a recipe's AI-estimated micronutrient content against NIH DRI/UL targets for the
 * patient's age/sex. Throws only on invalid input (a negative/non-finite estimate, or a
 * negative goal percent) — a nutrient missing its goal or exceeding its UL is reported via the
 * entry's flags, never thrown, the same "report, don't crash" philosophy reconcilePrescription
 * uses for an inconsistent prescription.
 */
export function evaluateMicronutrientIntake(
  input: MicronutrientAnalysisInput
): MicronutrientAnalysisResult {
  const { estimates, ageYears, sexForDri, goalPercentDri, doNotExceedUl } = input;

  if (!Number.isFinite(goalPercentDri) || goalPercentDri < 0) {
    throw new Error(`goalPercentDri must be a non-negative number, received ${goalPercentDri}`);
  }
  for (const id of MICRONUTRIENT_IDS) {
    const amount = estimates[id];
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      throw new Error(`estimates.${id} must be a non-negative number, received ${amount}`);
    }
  }

  const lifeStageGroup = resolveLifeStageGroup(ageYears, sexForDri);
  const targets = DRI_UL_TABLE[lifeStageGroup];

  const entries: MicronutrientAnalysisEntry[] = MICRONUTRIENT_IDS.map((id) => {
    const estimatedAmount = estimates[id];
    const { dri, ul } = targets[id];
    const unit = MICRONUTRIENT_UNITS[id];
    const percentOfDri = round((estimatedAmount / dri) * 100, 1);
    const meetsGoal = percentOfDri >= goalPercentDri;
    const exceedsUl = doNotExceedUl && ul !== null && estimatedAmount > ul;

    let note: string | undefined;
    if (exceedsUl) {
      note = `Exceeds the Tolerable Upper Intake Level of ${ul} ${unit}.`;
    } else if (!meetsGoal) {
      note = `${percentOfDri}% of DRI (${dri} ${unit}) — below the ${goalPercentDri}% goal.`;
    } else if (ul === null) {
      note = "No Tolerable Upper Intake Level has been established for this nutrient.";
    }

    return {
      id,
      label: MICRONUTRIENT_LABELS[id],
      unit,
      estimatedAmount,
      driTarget: dri,
      percentOfDri,
      meetsGoal,
      ulTarget: ul,
      exceedsUl,
      note,
    };
  });

  return {
    lifeStageGroup,
    goalPercentDri,
    entries,
    allMeetGoal: entries.every((entry) => entry.meetsGoal),
    anyExceedsUl: entries.some((entry) => entry.exceedsUl),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
