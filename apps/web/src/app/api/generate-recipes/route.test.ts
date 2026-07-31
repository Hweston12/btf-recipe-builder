// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import { POST } from "./route";

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

function requestFor(body: unknown): Request {
  return new Request("http://localhost/api/generate-recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/generate-recipes", () => {
  it("returns 200 with an array of candidate recipes for a valid intake", async () => {
    const response = await POST(requestFor(validIntake()));
    expect(response.status).toBe(200);
    const candidates = await response.json();
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(requestFor("not json"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 with issues for a structurally invalid intake", async () => {
    const intake = validIntake();
    (intake.prescription as { caloriesKcal: number }).caloriesKcal = -100;
    const response = await POST(requestFor(intake));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.some((i: { path: string }) => i.path === "prescription.caloriesKcal")).toBe(
      true
    );
  });

  it("returns 422 with contradictions when an exclusion is also preferred", async () => {
    const intake = validIntake();
    intake.medicalRestrictions.absoluteExclusions = ["chicken"];
    intake.foodPreferences.preferred = ["chicken"];
    const response = await POST(requestFor(intake));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.contradictions.length).toBeGreaterThan(0);
  });

  it("returns 422 with a warning when prescription numbers are inconsistent", async () => {
    const intake = validIntake();
    intake.prescription.caloriesKcal = 100;
    intake.prescription.finalVolumeMl = 1500;
    intake.prescription.targetDensityKcalPerMl = 1.2;
    const response = await POST(requestFor(intake));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.warning).toBeTruthy();
  });
});
