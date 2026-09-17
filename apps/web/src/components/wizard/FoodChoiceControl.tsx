"use client";

/** The three states a family can assign to a food on step 4. */
export type FoodChoice = "preferred" | "acceptable" | "excluded";

export const FOOD_CHOICE_OPTIONS: { value: FoodChoice; symbol: string; label: string }[] = [
  { value: "preferred", symbol: "♥", label: "Preferred" },
  { value: "acceptable", symbol: "○", label: "Okay to use" },
  { value: "excluded", symbol: "×", label: "Do not use" },
];

interface FoodChoiceControlProps {
  /** Unique within the form — used to group this food's three radios. */
  name: string;
  label: string;
  /** Undefined means unrated, which is distinct from "Do not use". */
  value: FoodChoice | undefined;
  onChange: (value: FoodChoice | undefined) => void;
  /**
   * Set when a medical exclusion from step 3 rules this food out. The control
   * renders as static text with the reason and exposes no radios at all — a
   * medical exclusion is not a preference the family gets to override.
   */
  blockedReason?: string;
  /** Set when the whole category is marked "No preference". */
  disabled?: boolean;
}

export default function FoodChoiceControl({
  name,
  label,
  value,
  onChange,
  blockedReason,
  disabled,
}: FoodChoiceControlProps) {
  if (blockedReason) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-1.5">
        <span className="text-sm text-neutral-400 line-through dark:text-neutral-500">{label}</span>
        <span className="text-sm text-red-600 dark:text-red-400">{blockedReason}</span>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
      <legend className="sr-only">{label}</legend>
      <span className="text-sm" aria-hidden="true">
        {label}
      </span>

      <div className="flex gap-1">
        {FOOD_CHOICE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              title={`${label} — ${option.label}`}
              className={[
                "cursor-pointer rounded border px-2 py-1 text-xs",
                selected
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300",
                disabled ? "cursor-not-allowed opacity-40" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={option.value}
                checked={selected}
                disabled={disabled}
                aria-label={`${label} — ${option.label}`}
                // A radio can't clear itself, so re-picking the current choice
                // returns the food to unrated. onChange won't fire for an
                // already-checked radio, hence onClick.
                onClick={() => onChange(selected ? undefined : option.value)}
                onChange={() => {}}
              />
              <span aria-hidden="true">
                {option.symbol} {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
