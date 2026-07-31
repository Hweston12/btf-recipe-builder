import { describe, it, expect } from "vitest";
import { validatePatientIntake } from "./index";
import type { PatientIntake } from "./index";

function validIntake(): PatientIntake {
  return {
    patient: { ageYears: 45, sexForDri: "female", weightKg: 68 },
    prescription: {
      caloriesKcal: 1800,
      finalVolumeMl: 1500,
      targetDensityKcalPerMl: 1.2,
      feedsPerDay: 4,
      iddsiTarget: 2,
      macroTargets: {
        carbohydratePercent: [40, 50],
        fatPercent: [25, 35],
        proteinPercent: [15, 25],
      },
      micronutrientMinimumPercentDri: 100,
      doNotExceedUl: true,
    },
    medicalRestrictions: {
      absoluteExclusions: ["peanut"],
      glutenFree: true,
      foodsToLimit: ["sodium"],
    },
    foodPreferences: {
      preferred: ["chicken"],
      acceptable: ["rice"],
      useSparingly: ["cheese"],
      excluded: ["fish"],
    },
    practicalConstraints: {
      maximumIngredients: 6,
      budgetLevel: "moderate",
      blenderType: "high-powered",
      preparationFrequency: "daily",
      cuisinePreferences: ["mediterranean"],
    },
    feeding: {
      route: "G-tube",
      tubeSizeFr: 14,
      delivery: "bolus",
      historyOfClogging: false,
    },
  };
}

describe("validatePatientIntake", () => {
  it("accepts a well-formed intake", () => {
    const result = validatePatientIntake(validIntake());
    expect(result.valid).toBe(true);
  });

  it("rejects a non-object payload", () => {
    const result = validatePatientIntake("not an object");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("flags a non-positive ageYears", () => {
    const intake = validIntake();
    (intake.patient as { ageYears: number }).ageYears = -5;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path === "patient.ageYears")).toBe(true);
    }
  });

  it("flags an invalid sexForDri", () => {
    const intake = validIntake();
    (intake.patient as { sexForDri: string }).sexForDri = "other";
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path === "patient.sexForDri")).toBe(true);
    }
  });

  it("flags a non-positive caloriesKcal", () => {
    const intake = validIntake();
    (intake.prescription as { caloriesKcal: number }).caloriesKcal = 0;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path === "prescription.caloriesKcal")).toBe(true);
    }
  });

  it("flags an iddsiTarget out of range", () => {
    const intake = validIntake();
    (intake.prescription as { iddsiTarget: number }).iddsiTarget = 7;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path === "prescription.iddsiTarget")).toBe(true);
    }
  });

  it("flags a macroTargets range where min exceeds max", () => {
    const intake = validIntake();
    intake.prescription.macroTargets.fatPercent = [40, 20];
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => e.path === "prescription.macroTargets.fatPercent")
      ).toBe(true);
    }
  });

  it("flags a non-array foodsToLimit", () => {
    const intake = validIntake() as unknown as Record<string, unknown>;
    (intake.medicalRestrictions as Record<string, unknown>).foodsToLimit = "peanut";
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => e.path === "medicalRestrictions.foodsToLimit")
      ).toBe(true);
    }
  });

  it("flags a missing foodPreferences object entirely", () => {
    const intake = validIntake() as unknown as Record<string, unknown>;
    delete intake.foodPreferences;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path === "foodPreferences")).toBe(true);
    }
  });

  it("flags a non-positive maximumIngredients", () => {
    const intake = validIntake();
    (intake.practicalConstraints as { maximumIngredients: number }).maximumIngredients = 0;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => e.path === "practicalConstraints.maximumIngredients")
      ).toBe(true);
    }
  });

  it("flags a non-positive tubeSizeFr", () => {
    const intake = validIntake();
    (intake.feeding as { tubeSizeFr: number }).tubeSizeFr = -1;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path === "feeding.tubeSizeFr")).toBe(true);
    }
  });

  it("reports every failing field at once, not just the first", () => {
    const intake = validIntake();
    (intake.patient as { ageYears: number }).ageYears = -1;
    (intake.prescription as { caloriesKcal: number }).caloriesKcal = -1;
    (intake.feeding as { tubeSizeFr: number }).tubeSizeFr = -1;
    const result = validatePatientIntake(intake);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("patient.ageYears");
      expect(paths).toContain("prescription.caloriesKcal");
      expect(paths).toContain("feeding.tubeSizeFr");
    }
  });
});
