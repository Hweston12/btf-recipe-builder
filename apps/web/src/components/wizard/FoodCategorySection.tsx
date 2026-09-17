"use client";

import { useState } from "react";
import type { FoodCatalogCategory, FoodCatalogItem } from "@btf-recipe-builder/schema";
import FoodChoiceControl, { type FoodChoice } from "./FoodChoiceControl";

export interface CustomFood {
  /** Always prefixed "custom:" so it can never collide with a catalog id. */
  id: string;
  categoryId: string;
  name: string;
}

interface FoodCategorySectionProps {
  category: FoodCatalogCategory;
  choices: Record<string, FoodChoice>;
  onChoiceChange: (foodId: string, choice: FoodChoice | undefined) => void;
  /** foodId → reason, for foods ruled out by a step 3 medical exclusion. */
  blockedReasons: Record<string, string>;
  customFoods: CustomFood[];
  onAddCustomFood: (name: string) => void;
  onRemoveCustomFood: (id: string) => void;
  noPreference: boolean;
  onNoPreferenceChange: (value: boolean) => void;
  /** Detail text for the one item with requiresDetail (enteral formula). */
  detail: string;
  onDetailChange: (value: string) => void;
  /**
   * Controlled open state — the parent keeps only one category's id "open"
   * at a time, so opening this one closes whichever was open before.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function summarize(counts: Record<FoodChoice, number>): string {
  const parts: string[] = [];
  if (counts.preferred > 0) parts.push(`${counts.preferred} preferred`);
  if (counts.acceptable > 0) parts.push(`${counts.acceptable} okay`);
  if (counts.excluded > 0) parts.push(`${counts.excluded} not used`);
  return parts.length > 0 ? parts.join(" · ") : "none chosen";
}

export default function FoodCategorySection({
  category,
  choices,
  onChoiceChange,
  blockedReasons,
  customFoods,
  onAddCustomFood,
  onRemoveCustomFood,
  noPreference,
  onNoPreferenceChange,
  detail,
  onDetailChange,
  open,
  onOpenChange,
}: FoodCategorySectionProps) {
  const [draft, setDraft] = useState("");

  const counts: Record<FoodChoice, number> = { preferred: 0, acceptable: 0, excluded: 0 };
  for (const item of category.items) {
    const choice = choices[item.id];
    if (choice && !blockedReasons[item.id]) counts[choice] += 1;
  }
  for (const food of customFoods) {
    const choice = choices[food.id];
    if (choice) counts[choice] += 1;
  }

  const blockedCount = category.items.filter((item) => blockedReasons[item.id]).length;

  function handleAdd() {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    onAddCustomFood(trimmed);
    setDraft("");
  }

  // Grains are split so families still recognize potatoes, corn and peas as
  // vegetables even though they're listed as carbohydrate sources.
  const groups = new Map<string | undefined, FoodCatalogItem[]>();
  for (const item of category.items) {
    const existing = groups.get(item.subgroup);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.subgroup, [item]);
    }
  }

  return (
    <details
      open={open}
      className="rounded border border-neutral-300 px-4 py-3 dark:border-neutral-700"
    >
      {/*
        The click is handled here rather than via <details>'s native onToggle
        so only one category can ever be open: the summary's default action
        (toggle its own <details>) is blocked, and onOpenChange fully owns the
        state, which is what lets the parent close whichever other category
        was open.
      */}
      <summary
        className="cursor-pointer text-sm font-medium"
        onClick={(e) => {
          e.preventDefault();
          onOpenChange(!open);
        }}
      >
        {category.label}
        <span className="ml-2 font-normal text-neutral-500">
          {noPreference ? "no preference" : summarize(counts)}
          {blockedCount > 0 ? ` · ${blockedCount} medically excluded` : ""}
        </span>
      </summary>

      <div className="mt-3 space-y-3">
        <p className="text-sm text-neutral-500">{category.helpText}</p>

        {category.allowsNoPreference && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noPreference}
              onChange={(e) => onNoPreferenceChange(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            No preference — any of these is fine
          </label>
        )}

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {[...groups.entries()].map(([subgroup, items]) => (
            <div key={subgroup ?? "main"}>
              {subgroup && (
                <h3 className="pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {subgroup}
                </h3>
              )}
              {items.map((item) => (
                <div key={item.id}>
                  <FoodChoiceControl
                    name={`food-${item.id}`}
                    label={item.name}
                    value={choices[item.id]}
                    onChange={(choice) => onChoiceChange(item.id, choice)}
                    blockedReason={blockedReasons[item.id]}
                    disabled={noPreference}
                  />
                  {item.requiresDetail &&
                    !blockedReasons[item.id] &&
                    (choices[item.id] === "preferred" || choices[item.id] === "acceptable") && (
                      <label className="block pb-2 text-sm">
                        Which formula?
                        <input
                          type="text"
                          value={detail}
                          onChange={(e) => onDetailChange(e.target.value)}
                          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </label>
                    )}
                </div>
              ))}
            </div>
          ))}

          {customFoods.map((food) => (
            <div key={food.id} className="flex items-center gap-2">
              <div className="flex-1">
                <FoodChoiceControl
                  name={`food-${food.id}`}
                  label={food.name}
                  value={choices[food.id]}
                  onChange={(choice) => onChoiceChange(food.id, choice)}
                  disabled={noPreference}
                />
              </div>
              <button
                type="button"
                onClick={() => onRemoveCustomFood(food.id)}
                aria-label={`Remove ${food.name}`}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="text"
              aria-label={`Other ${category.label.toLowerCase()}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Other food&hellip;"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Foods added here aren&rsquo;t checked against the allergies from the previous step.
          </p>
        </div>
      </div>
    </details>
  );
}
