import type { VerifiedDensityResult } from "@btf-recipe-builder/calculation";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";

export interface RecipeCardIddsiSummary {
  levelName: string;
  confirmedBySyringeTest: boolean;
  matchesTarget: boolean;
  note: string;
}

interface RecipeCardProps {
  intake: PatientIntake;
  candidate: CandidateRecipe;
  verifiedDensity: VerifiedDensityResult;
  iddsi: RecipeCardIddsiSummary;
}

function NutrientRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <p className="flex justify-between border-b border-neutral-200 py-1 dark:border-neutral-800">
      <span>{label}</span>
      <span>
        {value} {unit} <em className="text-neutral-500">(estimated)</em>
      </span>
    </p>
  );
}

export default function RecipeCard({ intake, candidate, verifiedDensity, iddsi }: RecipeCardProps) {
  const { aiEstimatedValues } = candidate;

  return (
    <div className="space-y-6 print:text-black">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-lg font-medium">Recipe card &mdash; {candidate.label}</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Print recipe card
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Ingredients</h3>
        <ul className="space-y-1 text-sm">
          {candidate.ingredients.map((ingredient) => (
            <li key={ingredient.name} className="flex justify-between">
              <span>{ingredient.name}</span>
              <span>{ingredient.grams} g</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded border border-neutral-300 p-4 text-sm dark:border-neutral-700">
        <h3 className="text-sm font-medium">Estimated nutrition</h3>
        <p className="text-neutral-500">{candidate.estimateDisclaimer}</p>
        <NutrientRow label="Calories" value={aiEstimatedValues.caloriesKcal} unit="kcal" />
        <NutrientRow label="Protein" value={aiEstimatedValues.proteinGrams} unit="g" />
        <NutrientRow label="Carbohydrate" value={aiEstimatedValues.carbohydrateGrams} unit="g" />
        <NutrientRow label="Fat" value={aiEstimatedValues.fatGrams} unit="g" />
        <NutrientRow label="Fiber" value={aiEstimatedValues.fiberGrams} unit="g" />
        <NutrientRow label="Fluid" value={aiEstimatedValues.fluidMl} unit="mL" />
        <NutrientRow label="Density" value={aiEstimatedValues.densityKcalPerMl} unit="kcal/mL" />
        {candidate.informationalNote && (
          <p className="text-neutral-500">{candidate.informationalNote}</p>
        )}
      </section>

      <section className="space-y-2 text-sm">
        <h3 className="text-sm font-medium">Prep instructions</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Blend the ingredients above together.</li>
          <li>
            Measure the blended volume and add water to reach the target final volume of{" "}
            {intake.prescription.finalVolumeMl} mL.
          </li>
          <li>
            Verified density: {verifiedDensity.verifiedDensityKcalPerMl} kcal/mL (target{" "}
            {intake.prescription.targetDensityKcalPerMl} kcal/mL) &mdash;{" "}
            {verifiedDensity.withinTolerance ? "within tolerance" : "outside tolerance, review before use"}.
          </li>
          <li>
            Perform the physical IDDSI syringe flow test before use. Confirmed level: {iddsi.levelName}
            {!iddsi.confirmedBySyringeTest &&
              " (syringe test alone could not confirm this level — a fork-drip test was recommended)."}
            {iddsi.confirmedBySyringeTest &&
              (iddsi.matchesTarget ? " — matches the target level." : " — does not match the target level; review before use.")}
          </li>
        </ol>
      </section>

      <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        This recipe uses AI-estimated nutrition values that have not been lab-verified. Check with the
        patient&apos;s physician or dietitian before starting or changing a tube feeding regimen.
      </section>
    </div>
  );
}
