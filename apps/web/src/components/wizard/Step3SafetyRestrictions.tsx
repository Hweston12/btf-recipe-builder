"use client";

import { useState } from "react";
import type { MedicalRestrictions } from "@btf-recipe-builder/schema";

export interface Step3Output {
  medicalRestrictions: MedicalRestrictions;
}

interface Step3SafetyRestrictionsProps {
  onComplete: (output: Step3Output) => void;
  onBack: () => void;
  initialValues?: Step3Output | null;
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

export default function Step3SafetyRestrictions({
  onComplete,
  onBack,
  initialValues,
}: Step3SafetyRestrictionsProps) {
  const [absoluteExclusions, setAbsoluteExclusions] = useState(
    initialValues?.medicalRestrictions.absoluteExclusions ?? []
  );
  const [foodsToLimit, setFoodsToLimit] = useState(
    initialValues?.medicalRestrictions.foodsToLimit ?? []
  );
  const [glutenFree, setGlutenFree] = useState(
    initialValues?.medicalRestrictions.glutenFree ?? false
  );

  function handleContinue() {
    onComplete({
      medicalRestrictions: { absoluteExclusions, foodsToLimit, glutenFree },
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
        legend="Absolute exclusions"
        helpText="Ingredients that must never appear in the recipe — allergies or other hard restrictions."
        values={absoluteExclusions}
        onAdd={(value) => setAbsoluteExclusions((prev) => [...prev, value])}
        onRemove={(index) => setAbsoluteExclusions((prev) => prev.filter((_, i) => i !== index))}
      />

      <TagList
        legend="Foods to limit"
        helpText="Ingredients that are allowed but should be used sparingly or capped in quantity."
        values={foodsToLimit}
        onAdd={(value) => setFoodsToLimit((prev) => [...prev, value])}
        onRemove={(index) => setFoodsToLimit((prev) => prev.filter((_, i) => i !== index))}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Other</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={glutenFree}
            onChange={(e) => setGlutenFree(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
          />
          Gluten-free
        </label>
      </fieldset>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="text-sm underline">
          Back
        </button>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
