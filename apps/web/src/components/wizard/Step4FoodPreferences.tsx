"use client";

import { useMemo, useState } from "react";
import {
  FOOD_CATALOG,
  allergenLabel,
  allergensFromRestrictions,
  findCatalogItem,
  validateAllergenExclusions,
  validateFoodRestrictions,
  type FoodPreferences,
  type MedicalRestrictions,
  type PracticalConstraints,
} from "@btf-recipe-builder/schema";
import { blurNumberInputOnWheel } from "@/lib/blurNumberInputOnWheel";
import FoodCategorySection, { type CustomFood } from "./FoodCategorySection";
import type { FoodChoice } from "./FoodChoiceControl";

const BLENDER_TYPE_OPTIONS: { value: PracticalConstraints["blenderType"]; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "high-powered", label: "High-powered" },
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

const DETAIL_SEPARATOR = " — ";

/**
 * Rebuilds the per-food state from a previously submitted Step4Output, so
 * going Back and returning restores every rating. Names that aren't in the
 * catalog are restored as custom foods on the category they were added to if
 * that's recoverable, and on the first category otherwise — a custom food's
 * category carries no meaning downstream, only its name does.
 */
function hydrate(initialValues?: Step4Output | null): {
  choices: Record<string, FoodChoice>;
  customFoods: CustomFood[];
  detail: string;
} {
  const choices: Record<string, FoodChoice> = {};
  const customFoods: CustomFood[] = [];
  let detail = "";

  const byName = new Map<string, { id: string; requiresDetail?: boolean }>();
  for (const category of FOOD_CATALOG) {
    for (const item of category.items) {
      byName.set(item.name.toLowerCase(), item);
    }
  }

  const lists: [FoodChoice, string[]][] = [
    ["preferred", initialValues?.foodPreferences.preferred ?? []],
    ["acceptable", initialValues?.foodPreferences.acceptable ?? []],
    ["excluded", initialValues?.foodPreferences.excluded ?? []],
  ];

  for (const [choice, names] of lists) {
    for (const name of names) {
      // "Commercial enteral formula — Compleat" splits back into the catalog
      // item plus its detail.
      const [base, ...rest] = name.split(DETAIL_SEPARATOR);
      const item = byName.get(base.trim().toLowerCase());

      if (item) {
        choices[item.id] = choice;
        if (item.requiresDetail && rest.length > 0) detail = rest.join(DETAIL_SEPARATOR);
        continue;
      }

      const id = `custom:${name.toLowerCase()}`;
      if (choices[id]) continue;
      choices[id] = choice;
      customFoods.push({ id, categoryId: FOOD_CATALOG[0].id, name });
    }
  }

  return { choices, customFoods, detail };
}

export default function Step4FoodPreferences({
  onComplete,
  onBack,
  initialValues,
  medicalRestrictions,
}: Step4FoodPreferencesProps) {
  const [hydrated] = useState(() => hydrate(initialValues));
  const [choices, setChoices] = useState<Record<string, FoodChoice>>(hydrated.choices);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>(hydrated.customFoods);
  const [formulaDetail, setFormulaDetail] = useState(hydrated.detail);
  const [noPreferenceCategories, setNoPreferenceCategories] = useState<Set<string>>(new Set());
  // Accordion: only one category open at a time. Starts on the first so
  // there's something to see on load; "" means everything is collapsed.
  const [openCategoryId, setOpenCategoryId] = useState<string>(FOOD_CATALOG[0].id);

  const [maximumIngredients, setMaximumIngredients] = useState(
    initialValues ? String(initialValues.practicalConstraints.maximumIngredients) : ""
  );
  const [blenderType, setBlenderType] = useState<PracticalConstraints["blenderType"] | "">(
    initialValues?.practicalConstraints.blenderType ?? ""
  );

  /**
   * Foods ruled out by a step 3 medical exclusion, as foodId → reason. These
   * render locked rather than selectable, which is what keeps a taste
   * preference from ever overriding a medical exclusion.
   */
  const blockedReasons = useMemo(() => {
    const allergens = allergensFromRestrictions(medicalRestrictions);
    if (allergens.length === 0) return {};

    const declared = new Set(allergens);
    const reasons: Record<string, string> = {};

    for (const category of FOOD_CATALOG) {
      for (const item of category.items) {
        const conflicting = item.allergens.filter((allergen) => declared.has(allergen));
        if (conflicting.length === 0) continue;
        reasons[item.id] =
          conflicting[0] === "gluten"
            ? "excluded — gluten-free"
            : `excluded — ${allergenLabel(conflicting[0]).toLowerCase()} allergy`;
      }
    }

    return reasons;
  }, [medicalRestrictions]);

  const foodPreferences = useMemo((): FoodPreferences => {
    const preferred: string[] = [];
    const acceptable: string[] = [];
    const excluded: string[] = [];
    const buckets = { preferred, acceptable, excluded };

    for (const [foodId, choice] of Object.entries(choices)) {
      // A blocked food can't be rated, and a "no preference" category's
      // ratings are held but not submitted.
      if (blockedReasons[foodId]) continue;

      const item = findCatalogItem(foodId);
      if (item) {
        const category = FOOD_CATALOG.find((c) => c.items.includes(item));
        if (category && noPreferenceCategories.has(category.id)) continue;

        const detail = formulaDetail.trim();
        buckets[choice].push(
          item.requiresDetail && detail !== ""
            ? `${item.name}${DETAIL_SEPARATOR}${detail}`
            : item.name
        );
        continue;
      }

      const custom = customFoods.find((food) => food.id === foodId);
      if (!custom) continue;
      if (noPreferenceCategories.has(custom.categoryId)) continue;
      buckets[choice].push(custom.name);
    }

    return { preferred, acceptable, excluded };
  }, [choices, customFoods, blockedReasons, formulaDetail, noPreferenceCategories]);

  const contradictions = useMemo(
    () => [
      ...validateFoodRestrictions(medicalRestrictions, foodPreferences),
      ...validateAllergenExclusions(medicalRestrictions, foodPreferences),
    ],
    [medicalRestrictions, foodPreferences]
  );

  const parsedMaximumIngredients = Number(maximumIngredients);
  const practicalConstraintsValid =
    maximumIngredients.trim() !== "" &&
    Number.isInteger(parsedMaximumIngredients) &&
    parsedMaximumIngredients > 0 &&
    blenderType !== "";

  const canContinue = practicalConstraintsValid && contradictions.length === 0;

  function handleChoiceChange(foodId: string, choice: FoodChoice | undefined) {
    setChoices((prev) => {
      const next = { ...prev };
      if (choice === undefined) {
        delete next[foodId];
      } else {
        next[foodId] = choice;
      }
      return next;
    });
  }

  function handleAddCustomFood(categoryId: string, name: string) {
    const id = `custom:${name.toLowerCase()}`;
    setCustomFoods((prev) =>
      prev.some((food) => food.id === id) ? prev : [...prev, { id, categoryId, name }]
    );
  }

  function handleRemoveCustomFood(id: string) {
    setCustomFoods((prev) => prev.filter((food) => food.id !== id));
    handleChoiceChange(id, undefined);
  }

  function handleNoPreferenceChange(categoryId: string, value: boolean) {
    setNoPreferenceCategories((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }
      return next;
    });
  }

  function handleContinue() {
    if (!canContinue) return;
    onComplete({
      foodPreferences,
      practicalConstraints: {
        maximumIngredients: parsedMaximumIngredients,
        blenderType,
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
      <div className="space-y-3">
        <p className="text-sm text-neutral-500">
          Rate any foods you have an opinion about — ♥ preferred, ○ okay to use, or × do not use.
          Anything left unrated is treated as &ldquo;no opinion&rdquo;, which the recipe engine may
          still use to meet a nutrition target. Foods ruled out by the allergies you entered on the
          previous step are locked and can&rsquo;t be chosen here.
        </p>

        {FOOD_CATALOG.map((category) => (
          <FoodCategorySection
            key={category.id}
            category={category}
            choices={choices}
            onChoiceChange={handleChoiceChange}
            blockedReasons={blockedReasons}
            customFoods={customFoods.filter((food) => food.categoryId === category.id)}
            onAddCustomFood={(name) => handleAddCustomFood(category.id, name)}
            onRemoveCustomFood={handleRemoveCustomFood}
            noPreference={noPreferenceCategories.has(category.id)}
            onNoPreferenceChange={(value) => handleNoPreferenceChange(category.id, value)}
            detail={formulaDetail}
            onDetailChange={setFormulaDetail}
            open={openCategoryId === category.id}
            onOpenChange={(isOpen) => setOpenCategoryId(isOpen ? category.id : "")}
          />
        ))}
      </div>

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
            onWheel={blurNumberInputOnWheel}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
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
      </fieldset>

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
