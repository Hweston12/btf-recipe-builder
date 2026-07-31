import { describe, expect, it } from "vitest";
import { assemblePatientIntake } from "./assemblePatientIntake";
import type { Step1Output } from "@/components/wizard/Step1NutritionBasics";
import type { Step2Output } from "@/components/wizard/Step2FeedingSetup";
import type { Step3Output } from "@/components/wizard/Step3SafetyRestrictions";
import type { Step4Output } from "@/components/wizard/Step4FoodPreferences";

const step1: Step1Output = {
  patient: { ageYears: 45, sexForDri: "female", weightKg: 60 },
  prescriptionCore: { caloriesKcal: 1800, finalVolumeMl: 1200, densityKcalPerMl: 1.5 },
};

const step2: Step2Output = {
  feeding: {
    route: "gastrostomy",
    tubeSizeFr: 18,
    delivery: "bolus",
    historyOfClogging: false,
  },
  prescriptionRest: {
    feedsPerDay: 5,
    iddsiTarget: 0,
    macroTargets: {
      carbohydratePercent: [45, 55],
      fatPercent: [25, 35],
      proteinPercent: [15, 25],
    },
    micronutrientMinimumPercentDri: 100,
    doNotExceedUl: true,
  },
};

const step3: Step3Output = {
  medicalRestrictions: {
    absoluteExclusions: ["peanuts"],
    glutenFree: true,
    foodsToLimit: ["banana"],
  },
};

const step4: Step4Output = {
  foodPreferences: {
    preferred: ["oats", "banana"],
    acceptable: ["chicken"],
    useSparingly: ["honey"],
    excluded: ["broccoli"],
  },
  practicalConstraints: {
    maximumIngredients: 8,
    budgetLevel: "moderate",
    blenderType: "standard",
    preparationFrequency: "daily",
    cuisinePreferences: [],
  },
};

describe("assemblePatientIntake", () => {
  it("combines all four step outputs into one PatientIntake", () => {
    const intake = assemblePatientIntake(step1, step2, step3, step4);

    expect(intake.patient).toEqual(step1.patient);
    expect(intake.feeding).toEqual(step2.feeding);
    expect(intake.medicalRestrictions).toEqual(step3.medicalRestrictions);
    expect(intake.foodPreferences).toEqual(step4.foodPreferences);
    expect(intake.practicalConstraints).toEqual(step4.practicalConstraints);

    expect(intake.prescription).toEqual({
      caloriesKcal: step1.prescriptionCore.caloriesKcal,
      finalVolumeMl: step1.prescriptionCore.finalVolumeMl,
      targetDensityKcalPerMl: step1.prescriptionCore.densityKcalPerMl,
      feedsPerDay: step2.prescriptionRest.feedsPerDay,
      iddsiTarget: step2.prescriptionRest.iddsiTarget,
      macroTargets: step2.prescriptionRest.macroTargets,
      micronutrientMinimumPercentDri: step2.prescriptionRest.micronutrientMinimumPercentDri,
      doNotExceedUl: step2.prescriptionRest.doNotExceedUl,
    });
  });
});
