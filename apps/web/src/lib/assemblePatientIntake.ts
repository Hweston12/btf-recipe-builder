import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { Step1Output } from "@/components/wizard/Step1NutritionBasics";
import type { Step2Output } from "@/components/wizard/Step2FeedingSetup";
import type { Step3Output } from "@/components/wizard/Step3SafetyRestrictions";
import type { Step4Output } from "@/components/wizard/Step4FoodPreferences";

export function assemblePatientIntake(
  step1: Step1Output,
  step2: Step2Output,
  step3: Step3Output,
  step4: Step4Output
): PatientIntake {
  return {
    patient: step1.patient,
    prescription: {
      caloriesKcal: step1.prescriptionCore.caloriesKcal,
      finalVolumeMl: step1.prescriptionCore.finalVolumeMl,
      targetDensityKcalPerMl: step1.prescriptionCore.densityKcalPerMl,
      feedsPerDay: step2.prescriptionRest.feedsPerDay,
      iddsiTarget: step2.prescriptionRest.iddsiTarget,
      macroTargets: step2.prescriptionRest.macroTargets,
      micronutrientMinimumPercentDri: step2.prescriptionRest.micronutrientMinimumPercentDri,
      doNotExceedUl: step2.prescriptionRest.doNotExceedUl,
    },
    medicalRestrictions: step3.medicalRestrictions,
    foodPreferences: step4.foodPreferences,
    practicalConstraints: step4.practicalConstraints,
    feeding: step2.feeding,
  };
}
