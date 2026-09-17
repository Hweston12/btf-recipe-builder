import type { CandidateRecipe } from "@/lib/recipeEngine/types";

interface CandidateSummaryProps {
  candidate: CandidateRecipe;
  selected: boolean;
  onSelect: () => void;
}

/**
 * The compact, glanceable picker item for one candidate — label, calories, ingredient
 * count, and a Select button. Lives in the left column of Step5GenerateReview; the full
 * ingredient list and nutrition table only render for whichever candidate is selected,
 * in CandidateDetail — showing that for all three at once was the main source of the
 * page's excess scrolling.
 */
export default function CandidateSummary({ candidate, selected, onSelect }: CandidateSummaryProps) {
  return (
    <div
      className={`space-y-2 rounded border p-3 text-sm ${
        selected
          ? "border-neutral-900 dark:border-neutral-100"
          : "border-neutral-300 dark:border-neutral-700"
      }`}
    >
      <p className="font-medium">{candidate.label}</p>
      <p className="text-neutral-500">
        {candidate.aiEstimatedValues.caloriesKcal} kcal &middot; {candidate.ingredients.length}{" "}
        ingredients
      </p>
      <button
        type="button"
        onClick={onSelect}
        className="w-full rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        disabled={selected}
      >
        {selected ? "Selected" : "Select this recipe"}
      </button>
    </div>
  );
}
