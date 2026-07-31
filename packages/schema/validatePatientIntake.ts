import { PatientIntake } from "./types";

/** A single failed check found while validating an untrusted PatientIntake payload. */
export interface IntakeValidationIssue {
  path: string;
  message: string;
}

export type IntakeValidationResult =
  | { valid: true; intake: PatientIntake }
  | { valid: false; errors: IntakeValidationIssue[] };

/**
 * Runtime structural/range check for a PatientIntake payload arriving as
 * unknown JSON (e.g. an API route body) — the TypeScript PatientIntake type
 * in ./types is compile-time only and erased at runtime, so this is the
 * actual boundary that catches a malformed or malicious request body.
 *
 * Collects every failing field into `errors` rather than stopping at the
 * first, matching validateFoodRestrictions's "report everything" convention.
 * Never throws.
 */
export function validatePatientIntake(data: unknown): IntakeValidationResult {
  const errors: IntakeValidationIssue[] = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { valid: false, errors: [{ path: "", message: "Payload must be an object." }] };
  }

  const record = data as Record<string, unknown>;

  checkPatient(record.patient, errors);
  checkPrescription(record.prescription, errors);
  checkMedicalRestrictions(record.medicalRestrictions, errors);
  checkFoodPreferences(record.foodPreferences, errors);
  checkPracticalConstraints(record.practicalConstraints, errors);
  checkFeeding(record.feeding, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, intake: record as unknown as PatientIntake };
}

function push(errors: IntakeValidationIssue[], path: string, message: string) {
  errors.push({ path, message });
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function checkPatient(value: unknown, errors: IntakeValidationIssue[]) {
  const patient = asRecord(value);
  if (!patient) {
    push(errors, "patient", "patient is required and must be an object.");
    return;
  }
  if (!isPositiveNumber(patient.ageYears)) {
    push(errors, "patient.ageYears", "ageYears must be a positive number.");
  }
  if (!isPositiveNumber(patient.weightKg)) {
    push(errors, "patient.weightKg", "weightKg must be a positive number.");
  }
  if (patient.sexForDri !== "male" && patient.sexForDri !== "female") {
    push(errors, "patient.sexForDri", 'sexForDri must be "male" or "female".');
  }
}

function isValidPercentRange(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [min, max] = value;
  return (
    typeof min === "number" &&
    typeof max === "number" &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min >= 0 &&
    max <= 100 &&
    min <= max
  );
}

function checkPrescription(value: unknown, errors: IntakeValidationIssue[]) {
  const prescription = asRecord(value);
  if (!prescription) {
    push(errors, "prescription", "prescription is required and must be an object.");
    return;
  }
  if (!isPositiveNumber(prescription.caloriesKcal)) {
    push(errors, "prescription.caloriesKcal", "caloriesKcal must be a positive number.");
  }
  if (!isPositiveNumber(prescription.finalVolumeMl)) {
    push(errors, "prescription.finalVolumeMl", "finalVolumeMl must be a positive number.");
  }
  if (!isPositiveNumber(prescription.targetDensityKcalPerMl)) {
    push(
      errors,
      "prescription.targetDensityKcalPerMl",
      "targetDensityKcalPerMl must be a positive number."
    );
  }
  if (!isPositiveInteger(prescription.feedsPerDay)) {
    push(errors, "prescription.feedsPerDay", "feedsPerDay must be a positive integer.");
  }
  if (
    typeof prescription.iddsiTarget !== "number" ||
    !Number.isInteger(prescription.iddsiTarget) ||
    prescription.iddsiTarget < 0 ||
    prescription.iddsiTarget > 4
  ) {
    push(errors, "prescription.iddsiTarget", "iddsiTarget must be an integer between 0 and 4.");
  }
  if (!isNonNegativeNumber(prescription.micronutrientMinimumPercentDri)) {
    push(
      errors,
      "prescription.micronutrientMinimumPercentDri",
      "micronutrientMinimumPercentDri must be a non-negative number."
    );
  }
  if (!isBoolean(prescription.doNotExceedUl)) {
    push(errors, "prescription.doNotExceedUl", "doNotExceedUl must be a boolean.");
  }

  const macroTargets = asRecord(prescription.macroTargets);
  if (!macroTargets) {
    push(errors, "prescription.macroTargets", "macroTargets is required and must be an object.");
  } else {
    for (const key of ["carbohydratePercent", "fatPercent", "proteinPercent"] as const) {
      if (!isValidPercentRange(macroTargets[key])) {
        push(
          errors,
          `prescription.macroTargets.${key}`,
          `${key} must be a [min, max] tuple with 0 <= min <= max <= 100.`
        );
      }
    }
  }
}

function checkMedicalRestrictions(value: unknown, errors: IntakeValidationIssue[]) {
  const restrictions = asRecord(value);
  if (!restrictions) {
    push(errors, "medicalRestrictions", "medicalRestrictions is required and must be an object.");
    return;
  }
  if (!isStringArray(restrictions.absoluteExclusions)) {
    push(
      errors,
      "medicalRestrictions.absoluteExclusions",
      "absoluteExclusions must be an array of strings."
    );
  }
  if (!isStringArray(restrictions.foodsToLimit)) {
    push(errors, "medicalRestrictions.foodsToLimit", "foodsToLimit must be an array of strings.");
  }
  if (!isBoolean(restrictions.glutenFree)) {
    push(errors, "medicalRestrictions.glutenFree", "glutenFree must be a boolean.");
  }
}

function checkFoodPreferences(value: unknown, errors: IntakeValidationIssue[]) {
  const preferences = asRecord(value);
  if (!preferences) {
    push(errors, "foodPreferences", "foodPreferences is required and must be an object.");
    return;
  }
  for (const key of ["preferred", "acceptable", "useSparingly", "excluded"] as const) {
    if (!isStringArray(preferences[key])) {
      push(errors, `foodPreferences.${key}`, `${key} must be an array of strings.`);
    }
  }
}

function checkPracticalConstraints(value: unknown, errors: IntakeValidationIssue[]) {
  const constraints = asRecord(value);
  if (!constraints) {
    push(
      errors,
      "practicalConstraints",
      "practicalConstraints is required and must be an object."
    );
    return;
  }
  if (!isPositiveInteger(constraints.maximumIngredients)) {
    push(
      errors,
      "practicalConstraints.maximumIngredients",
      "maximumIngredients must be a positive integer."
    );
  }
  for (const key of ["budgetLevel", "blenderType", "preparationFrequency"] as const) {
    if (!isNonEmptyString(constraints[key])) {
      push(errors, `practicalConstraints.${key}`, `${key} must be a non-empty string.`);
    }
  }
  if (!isStringArray(constraints.cuisinePreferences)) {
    push(
      errors,
      "practicalConstraints.cuisinePreferences",
      "cuisinePreferences must be an array of strings."
    );
  }
}

function checkFeeding(value: unknown, errors: IntakeValidationIssue[]) {
  const feeding = asRecord(value);
  if (!feeding) {
    push(errors, "feeding", "feeding is required and must be an object.");
    return;
  }
  if (!isNonEmptyString(feeding.route)) {
    push(errors, "feeding.route", "route must be a non-empty string.");
  }
  if (!isNonEmptyString(feeding.delivery)) {
    push(errors, "feeding.delivery", "delivery must be a non-empty string.");
  }
  if (!isPositiveNumber(feeding.tubeSizeFr)) {
    push(errors, "feeding.tubeSizeFr", "tubeSizeFr must be a positive number.");
  }
  if (!isBoolean(feeding.historyOfClogging)) {
    push(errors, "feeding.historyOfClogging", "historyOfClogging must be a boolean.");
  }
}
