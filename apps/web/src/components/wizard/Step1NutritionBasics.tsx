"use client";

import { useMemo, useState } from "react";
import {
  reconcilePrescription,
  type PrescriptionResult,
} from "@btf-recipe-builder/calculation";
import type { Patient } from "@btf-recipe-builder/schema";

export interface Step1Output {
  patient: Patient;
  prescriptionCore: {
    caloriesKcal: number;
    finalVolumeMl: number;
    densityKcalPerMl: number;
  };
}

interface Step1NutritionBasicsProps {
  onComplete: (output: Step1Output) => void;
  initialValues?: Step1Output | null;
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function Step1NutritionBasics({
  onComplete,
  initialValues,
}: Step1NutritionBasicsProps) {
  const [ageYears, setAgeYears] = useState(
    initialValues ? String(initialValues.patient.ageYears) : ""
  );
  const [weightKg, setWeightKg] = useState(
    initialValues ? String(initialValues.patient.weightKg) : ""
  );
  const [sexForDri, setSexForDri] = useState<Patient["sexForDri"] | "">(
    initialValues?.patient.sexForDri ?? ""
  );

  const [caloriesKcal, setCaloriesKcal] = useState(
    initialValues ? String(initialValues.prescriptionCore.caloriesKcal) : ""
  );
  const [finalVolumeMl, setFinalVolumeMl] = useState(
    initialValues ? String(initialValues.prescriptionCore.finalVolumeMl) : ""
  );
  const [densityKcalPerMl, setDensityKcalPerMl] = useState(
    initialValues ? String(initialValues.prescriptionCore.densityKcalPerMl) : ""
  );

  const prescriptionInputs = useMemo(
    () => ({
      caloriesKcal: parseOptionalNumber(caloriesKcal),
      finalVolumeMl: parseOptionalNumber(finalVolumeMl),
      densityKcalPerMl: parseOptionalNumber(densityKcalPerMl),
    }),
    [caloriesKcal, finalVolumeMl, densityKcalPerMl]
  );

  const filledValues = Object.values(prescriptionInputs).filter((v) => v !== undefined);
  const allPositive = filledValues.every((v) => (v as number) > 0);

  const prescriptionResult: PrescriptionResult | null = useMemo(() => {
    if (filledValues.length < 2 || !allPositive) return null;
    return reconcilePrescription(prescriptionInputs);
  }, [prescriptionInputs, filledValues.length, allPositive]);

  const parsedAge = Number(ageYears);
  const parsedWeight = Number(weightKg);
  const patientValid =
    ageYears.trim() !== "" &&
    Number.isFinite(parsedAge) &&
    parsedAge > 0 &&
    weightKg.trim() !== "" &&
    Number.isFinite(parsedWeight) &&
    parsedWeight > 0 &&
    sexForDri !== "";

  const canContinue = patientValid && prescriptionResult !== null;

  function handleContinue() {
    if (!canContinue || !prescriptionResult) return;
    onComplete({
      patient: { ageYears: parsedAge, weightKg: parsedWeight, sexForDri },
      prescriptionCore: {
        caloriesKcal: prescriptionResult.caloriesKcal,
        finalVolumeMl: prescriptionResult.finalVolumeMl,
        densityKcalPerMl: prescriptionResult.densityKcalPerMl,
      },
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleContinue();
      }}
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Patient</legend>

        <label className="block text-sm">
          Age (years)
          <input
            type="number"
            min="0"
            step="any"
            value={ageYears}
            onChange={(e) => setAgeYears(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Weight (kg)
          <input
            type="number"
            min="0"
            step="any"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Sex (for DRI calculation)
          <select
            value={sexForDri}
            onChange={(e) => setSexForDri(e.target.value as Patient["sexForDri"] | "")}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-neutral-500">
          Prescription — enter any two, the third is calculated automatically
        </legend>

        <label className="block text-sm">
          Daily calories (kcal)
          <input
            type="number"
            min="0"
            step="any"
            value={caloriesKcal}
            onChange={(e) => setCaloriesKcal(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Target final volume (mL)
          <input
            type="number"
            min="0"
            step="any"
            value={finalVolumeMl}
            onChange={(e) => setFinalVolumeMl(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Target density (kcal/mL)
          <input
            type="number"
            min="0"
            step="any"
            value={densityKcalPerMl}
            onChange={(e) => setDensityKcalPerMl(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      </fieldset>

      {filledValues.length > 0 && filledValues.length < 2 && (
        <p className="text-sm text-neutral-500">Enter at least two of the three values above.</p>
      )}

      {filledValues.length >= 2 && !allPositive && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Values must be greater than zero.
        </p>
      )}

      {prescriptionResult && (
        <div className="space-y-1 rounded border border-neutral-300 p-4 text-sm dark:border-neutral-700">
          <p className="flex justify-between">
            <span>{prescriptionResult.caloriesKcal} kcal</span>
            {prescriptionResult.calculatedField === "caloriesKcal" && (
              <span className="text-green-600 dark:text-green-400">Recommended</span>
            )}
          </p>
          <p className="flex justify-between">
            <span>{prescriptionResult.finalVolumeMl} mL final volume</span>
            {prescriptionResult.calculatedField === "finalVolumeMl" && (
              <span className="text-green-600 dark:text-green-400">Recommended</span>
            )}
          </p>
          <p className="flex justify-between">
            <span>{prescriptionResult.densityKcalPerMl} kcal/mL density</span>
            {prescriptionResult.calculatedField === "densityKcalPerMl" && (
              <span className="text-green-600 dark:text-green-400">Recommended</span>
            )}
          </p>
          {prescriptionResult.inconsistencyWarning && (
            <p className="text-amber-600 dark:text-amber-400">
              {prescriptionResult.inconsistencyWarning}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!canContinue}
        className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
      >
        Continue
      </button>
    </form>
  );
}
