"use client";

import { useState } from "react";

interface TagListProps {
  legend: string;
  helpText: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  /**
   * Accessible name for the add-field. The <legend> alone doesn't name the
   * input, so without this it has no accessible name at all.
   */
  inputLabel: string;
}

/**
 * A free-text add-field plus a list of removable chips. Shared by the steps
 * that still take open-ended entry — foods to limit, and the "other allergen"
 * escape hatch on step 3. Adds are de-duplicated case-insensitively.
 */
export default function TagList({
  legend,
  helpText,
  values,
  onAdd,
  onRemove,
  inputLabel,
}: TagListProps) {
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
          aria-label={inputLabel}
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
