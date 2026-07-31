"use client";

import { useMemo, useState } from "react";
import {
  validateFoodRestrictions,
  type FoodPreferences,
  type MedicalRestrictions,
  type PracticalConstraints,
} from "@btf-recipe-builder/schema";

const BUDGET_LEVEL_OPTIONS: { value: PracticalConstraints["budgetLevel"]; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const BLENDER_TYPE_OPTIONS: { value: PracticalConstraints["blenderType"]; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "high-powered", label: "High-powered" },
];

const PREPARATION_FREQUENCY_OPTIONS: {
  value: PracticalConstraints["preparationFrequency"];
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "every-2-3-days", label: "Every 2-3 days" },
  { value: "weekly", label: "Weekly" },
];

export interface Step4Output {
  foodPreferences: FoodPreferences;
  practicalConstraints: PracticalConstraints;
}

interface Step4FoodPreferencesProps {
  onComplete: (output: Step4Output) => void;
  onBack: () => void;
  initialValues?: Step4Output | null;
  medicalRestrictions: MedicalRestrictions;
}

function TagList({
  legend,
  helpText,
  values,
  onAdd,
  onRemove,
}: {
  legend: string;
  helpText: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{legend}</legend>
      <p className="text-sm text-neutral-500">{helpText}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="mt-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Add
        </button>
      </div>

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
            >
              {value}
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${value}`}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export default function Step4FoodPreferences({
  onComplete,
  onBack,
  initialValues,
  medicalRestrictions,
}: Step4FoodPreferencesProps) {
  const [preferred, setPreferred] = useState(initialValues?.foodPreferences.preferred ?? []);
  const [acceptable, setAcceptable] = useState(initialValues?.foodPreferences.acceptable ?? []);
  const [useSparingly, setUseSparingly] = useState(
    initialValues?.foodPreferences.useSparingly ?? []
  );
  const [excluded, setExcluded] = useState(initialValues?.foodPreferences.excluded ?? []);

  const [maximumIngredients, setMaximumIngredients] = useState(
    initialValues ? String(initialValues.practicalConstraints.maximumIngredients) : ""
  );
  const [budgetLevel, setBudgetLevel] = useState<PracticalConstraints["budgetLevel"] | "">(
    initialValues?.practicalConstraints.budgetLevel ?? ""
  );
  const [blenderType, setBlenderType] = useState<PracticalConstraints["blenderType"] | "">(
    initialValues?.practicalConstraints.blenderType ?? ""
  );
  const [preparationFrequency, setPreparationFrequency] = useState<
    PracticalConstraints["preparationFrequency"] | ""
  >(initialValues?.practicalConstraints.preparationFrequency ?? "");
  const [cuisinePreferences, setCuisinePreferences] = useState(
    initialValues?.practicalConstraints.cuisinePreferences ?? []
  );

  const contradictions = useMemo(
    () =>
      validateFoodRestrictions(medicalRestrictions, {
        preferred,
        acceptable,
        useSparingly,
        excluded,
      }),
    [medicalRestrictions, preferred, acceptable, useSparingly, excluded]
  );

  const parsedMaximumIngredients = Number(maximumIngredients);
  const practicalConstraintsValid =
    maximumIngredients.trim() !== "" &&
    Number.isInteger(parsedMaximumIngredients) &&
    parsedMaximumIngredients > 0 &&
    budgetLevel !== "" &&
    blenderType !== "" &&
    preparationFrequency !== "";

  const canContinue = practicalConstraintsValid && contradictions.length === 0;

  function handleContinue() {
    if (!canContinue) return;
    onComplete({
      foodPreferences: { preferred, acceptable, useSparingly, excluded },
      practicalConstraints: {
        maximumIngredients: parsedMaximumIngredients,
        budgetLevel,
        blenderType,
        preparationFrequency,
        cuisinePreferences,
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
      <TagList
        legend="Preferred foods"
        helpText="Foods the patient especially likes or tolerates well."
        values={preferred}
        onAdd={(value) => setPreferred((prev) => [...prev, value])}
        onRemove={(index) => setPreferred((prev) => prev.filter((_, i) => i !== index))}
      />

      <TagList
        legend="Acceptable foods"
        helpText="Foods that are fine to include but not a particular favorite."
        values={acceptable}
        onAdd={(value) => setAcceptable((prev) => [...prev, value])}
        onRemove={(index) => setAcceptable((prev) => prev.filter((_, i) => i !== index))}
      />

      <TagList
        legend="Use sparingly"
        helpText="Foods that are fine occasionally but shouldn't be a regular ingredient."
        values={useSparingly}
        onAdd={(value) => setUseSparingly((prev) => [...prev, value])}
        onRemove={(index) => setUseSparingly((prev) => prev.filter((_, i) => i !== index))}
      />

      <TagList
        legend="Excluded foods"
        helpText="Foods to leave out by preference, beyond the medical restrictions from the previous step."
        values={excluded}
        onAdd={(value) => setExcluded((prev) => [...prev, value])}
        onRemove={(index) => setExcluded((prev) => prev.filter((_, i) => i !== index))}
      />

      {contradictions.length > 0 && (
        <div className="space-y-1 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p className="font-medium">Resolve these conflicts before continuing:</p>
          <ul className="list-disc space-y-1 pl-5">
            {contradictions.map((c, i) => (
              <li key={`${c.ingredient}-${i}`}>{c.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Practical constraints</legend>

        <label className="block text-sm">
          Maximum ingredients
          <input
            type="number"
            min="0"
            step="1"
            value={maximumIngredients}
            onChange={(e) => setMaximumIngredients(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Budget
          <select
            value={budgetLevel}
            onChange={(e) =>
              setBudgetLevel(e.target.value as PracticalConstraints["budgetLevel"] | "")
            }
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            {BUDGET_LEVEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Blender type
          <select
            value={blenderType}
            onChange={(e) =>
              setBlenderType(e.target.value as PracticalConstraints["blenderType"] | "")
            }
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            {BLENDER_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Preparation frequency
          <select
            value={preparationFrequency}
            onChange={(e) =>
              setPreparationFrequency(
                e.target.value as PracticalConstraints["preparationFrequency"] | ""
              )
            }
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            {PREPARATION_FREQUENCY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <TagList
        legend="Cuisine preferences"
        helpText="Cuisines or flavor profiles the recipe should lean toward, if any."
        values={cuisinePreferences}
        onAdd={(value) => setCuisinePreferences((prev) => [...prev, value])}
        onRemove={(index) => setCuisinePreferences((prev) => prev.filter((_, i) => i !== index))}
      />

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="text-sm underline">
          Back
        </button>
        <button
          type="submit"
          disabled={!canContinue}
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
