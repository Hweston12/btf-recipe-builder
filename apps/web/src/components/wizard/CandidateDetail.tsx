import type { CandidateRecipe } from "@/lib/recipeEngine/types";

interface CandidateDetailProps {
  candidate: CandidateRecipe;
}

/**
 * The full ingredient list and nutrition table for whichever candidate is selected —
 * exactly what every candidate used to show inline, all three at once, in the pre-reorg
 * layout. Rendered once, in the right column, for the current selection only.
 */
export default function CandidateDetail({ candidate }: CandidateDetailProps) {
  return (
    <section className="space-y-2 rounded border border-neutral-900 p-4 text-sm dark:border-neutral-100">
      <p className="font-medium">{candidate.label}</p>
      <ul className="space-y-1">
        {candidate.ingredients.map((ingredient) => (
          <li key={ingredient.name} className="flex justify-between">
            <span>{ingredient.name}</span>
            <span>{ingredient.grams} g</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 rounded border border-neutral-200 p-3 dark:border-neutral-800">
        <p className="text-neutral-500">{candidate.estimateDisclaimer}</p>
        <p className="flex justify-between">
          <span>Calories</span>
          <span>{candidate.aiEstimatedValues.caloriesKcal} kcal</span>
        </p>
        <p className="flex justify-between">
          <span>Protein</span>
          <span>{candidate.aiEstimatedValues.proteinGrams} g</span>
        </p>
        <p className="flex justify-between">
          <span>Carbohydrate</span>
          <span>{candidate.aiEstimatedValues.carbohydrateGrams} g</span>
        </p>
        <p className="flex justify-between">
          <span>Fat</span>
          <span>{candidate.aiEstimatedValues.fatGrams} g</span>
        </p>
        <p className="flex justify-between">
          <span>Fiber</span>
          <span>{candidate.aiEstimatedValues.fiberGrams} g</span>
        </p>
        <p className="flex justify-between">
          <span>Fluid</span>
          <span>{candidate.aiEstimatedValues.fluidMl} mL</span>
        </p>
      </div>
    </section>
  );
}
