"use client";

import { useState } from "react";
import {
  ALLERGEN_OPTIONS,
  type Allergen,
  type MedicalRestrictions,
} from "@btf-recipe-builder/schema";
import TagList from "./TagList";

export interface Step3Output {
  medicalRestrictions: MedicalRestrictions;
}

interface Step3SafetyRestrictionsProps {
  onComplete: (output: Step3Output) => void;
  onBack: () => void;
  initialValues?: Step3Output | null;
}

/**
 * Recovers the checkbox selection from a stored absoluteExclusions array, so
 * going Back and returning to this step restores exactly what the user chose.
 * Any exclusion that isn't one of the ten known allergen labels is dropped —
 * there's no free-text field to put it back into. In practice this only
 * matters for an intake assembled before the free-text "other" field was
 * removed; restoring silently rather than erroring keeps Back navigation safe.
 */
function hydrate(initialValues?: Step3Output | null): Set<Allergen> {
  const allergens = new Set<Allergen>();

  for (const exclusion of initialValues?.medicalRestrictions.absoluteExclusions ?? []) {
    const match = ALLERGEN_OPTIONS.find(
      (option) => option.label.toLowerCase() === exclusion.trim().toLowerCase()
    );
    if (match) allergens.add(match.id);
  }

  if (initialValues?.medicalRestrictions.glutenFree) allergens.add("gluten");

  return allergens;
}

export default function Step3SafetyRestrictions({
  onComplete,
  onBack,
  initialValues,
}: Step3SafetyRestrictionsProps) {
  const [selectedAllergens, setSelectedAllergens] = useState<Set<Allergen>>(() =>
    hydrate(initialValues)
  );
  const [foodsToLimit, setFoodsToLimit] = useState(
    initialValues?.medicalRestrictions.foodsToLimit ?? []
  );

  function toggleAllergen(id: Allergen, checked: boolean) {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleContinue() {
    // Gluten is a diet flag rather than an ingredient, so it maps to the
    // glutenFree boolean instead of into absoluteExclusions. The other nine
    // are written by their display label, which is what the food catalog and
    // validateAllergenExclusions match against.
    const allergenExclusions = ALLERGEN_OPTIONS.filter(
      (option) => option.id !== "gluten" && selectedAllergens.has(option.id)
    ).map((option) => option.label);

    onComplete({
      medicalRestrictions: {
        absoluteExclusions: allergenExclusions,
        glutenFree: selectedAllergens.has("gluten"),
        foodsToLimit,
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
        <legend className="text-sm font-medium">Absolute exclusions</legend>
        <p className="text-sm text-neutral-500">
          Allergies and other hard restrictions. Anything checked here can never appear in the
          recipe, no matter what is chosen on the next step.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ALLERGEN_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedAllergens.has(option.id)}
                onChange={(e) => toggleAllergen(option.id, e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <TagList
        legend="Foods to limit"
        helpText="Ingredients that are allowed but should be used sparingly or capped in quantity."
        inputLabel="Food to limit"
        values={foodsToLimit}
        onAdd={(value) => setFoodsToLimit((prev) => [...prev, value])}
        onRemove={(index) => setFoodsToLimit((prev) => prev.filter((_, i) => i !== index))}
      />

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
