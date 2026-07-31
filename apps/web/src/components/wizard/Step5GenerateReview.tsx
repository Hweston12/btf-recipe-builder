"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateVerifiedDensity,
  calculateWaterTopUp,
  compareToTargetIddsiLevel,
  interpretIddsiFlowTest,
  type IddsiLevel,
} from "@btf-recipe-builder/calculation";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import { fetchCandidateRecipes } from "@/lib/recipeEngine/fetchCandidateRecipes";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";
import RecipeCard from "./RecipeCard";

export interface Step5Output {
  selectedCandidateId: string;
  reviewedNutrition: boolean;
  volumeConfirmation: {
    measuredFinalVolumeMl: number;
    verifiedDensityKcalPerMl: number;
    withinTolerance: boolean;
  };
  iddsiConfirmation: {
    remainingVolumeMl: number;
    level: IddsiLevel;
    confirmedBySyringeTest: boolean;
    matchesTarget: boolean;
  };
  physicianReminderAcknowledged: boolean;
}

interface Step5GenerateReviewProps {
  intake: PatientIntake;
  onComplete: (output: Step5Output) => void;
  onBack: () => void;
  initialValues?: Step5Output | null;
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function Step5GenerateReview({
  intake,
  onComplete,
  onBack,
  initialValues,
}: Step5GenerateReviewProps) {
  const [candidates, setCandidates] = useState<CandidateRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    initialValues?.selectedCandidateId ?? null
  );

  const [reviewedNutrition, setReviewedNutrition] = useState(
    initialValues?.reviewedNutrition ?? false
  );

  const [currentBlendedVolumeMl, setCurrentBlendedVolumeMl] = useState("");
  const [measuredFinalVolumeMl, setMeasuredFinalVolumeMl] = useState(
    initialValues ? String(initialValues.volumeConfirmation.measuredFinalVolumeMl) : ""
  );
  const [volumeConfirmed, setVolumeConfirmed] = useState(
    initialValues !== undefined && initialValues !== null
  );

  const [syringeRemainingVolumeMl, setSyringeRemainingVolumeMl] = useState(
    initialValues ? String(initialValues.iddsiConfirmation.remainingVolumeMl) : ""
  );
  const [iddsiTestConfirmed, setIddsiTestConfirmed] = useState(
    initialValues !== undefined && initialValues !== null
  );

  const [physicianReminderAcknowledged, setPhysicianReminderAcknowledged] = useState(
    initialValues?.physicianReminderAcknowledged ?? false
  );

  useEffect(() => {
    let cancelled = false;
    fetchCandidateRecipes(intake)
      .then((result) => {
        if (!cancelled) setCandidates(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to generate candidate recipes.");
        }
      });
    return () => {
      cancelled = true;
    };
    // Only regenerate if the intake itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCandidate = useMemo(
    () => candidates?.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

  const waterTopUpResult = useMemo(() => {
    const currentMl = parseOptionalNumber(currentBlendedVolumeMl);
    if (currentMl === undefined) return null;
    return calculateWaterTopUp({
      targetFinalVolumeMl: intake.prescription.finalVolumeMl,
      currentBlendedVolumeMl: currentMl,
    });
  }, [currentBlendedVolumeMl, intake.prescription.finalVolumeMl]);

  const verifiedDensityResult = useMemo(() => {
    const finalMl = parseOptionalNumber(measuredFinalVolumeMl);
    if (finalMl === undefined || finalMl <= 0 || !selectedCandidate) return null;
    return calculateVerifiedDensity({
      totalCalories: selectedCandidate.aiEstimatedValues.caloriesKcal,
      measuredFinalVolumeMl: finalMl,
      targetDensityKcalPerMl: intake.prescription.targetDensityKcalPerMl,
    });
  }, [measuredFinalVolumeMl, selectedCandidate, intake.prescription.targetDensityKcalPerMl]);

  const iddsiComputed = useMemo(() => {
    const remaining = parseOptionalNumber(syringeRemainingVolumeMl);
    if (remaining === undefined || remaining < 0 || remaining > 10) return null;
    const interpreted = interpretIddsiFlowTest({ remainingVolumeMl: remaining });
    const comparison = compareToTargetIddsiLevel(
      interpreted.level,
      intake.prescription.iddsiTarget as IddsiLevel
    );
    return { interpreted, comparison };
  }, [syringeRemainingVolumeMl, intake.prescription.iddsiTarget]);

  const allConfirmed =
    reviewedNutrition && volumeConfirmed && iddsiTestConfirmed && physicianReminderAcknowledged;

  function handleFinish() {
    if (
      !allConfirmed ||
      !selectedCandidate ||
      !verifiedDensityResult ||
      !iddsiComputed ||
      !measuredFinalVolumeMl ||
      !syringeRemainingVolumeMl
    ) {
      return;
    }
    onComplete({
      selectedCandidateId: selectedCandidate.id,
      reviewedNutrition,
      volumeConfirmation: {
        measuredFinalVolumeMl: Number(measuredFinalVolumeMl),
        verifiedDensityKcalPerMl: verifiedDensityResult.verifiedDensityKcalPerMl,
        withinTolerance: verifiedDensityResult.withinTolerance,
      },
      iddsiConfirmation: {
        remainingVolumeMl: Number(syringeRemainingVolumeMl),
        level: iddsiComputed.interpreted.level,
        confirmedBySyringeTest: iddsiComputed.interpreted.confirmedBySyringeTest,
        matchesTarget: iddsiComputed.comparison.matches,
      },
      physicianReminderAcknowledged,
    });
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  if (candidates === null) {
    return <p className="text-sm text-neutral-500">Generating candidate recipes&hellip;</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Candidate recipes</h3>
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className={`space-y-2 rounded border p-4 text-sm ${
                candidate.id === selectedCandidateId
                  ? "border-neutral-900 dark:border-neutral-100"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
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
              <button
                type="button"
                onClick={() => setSelectedCandidateId(candidate.id)}
                className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
                disabled={candidate.id === selectedCandidateId}
              >
                {candidate.id === selectedCandidateId ? "Selected" : "Select this recipe"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {selectedCandidate && (
        <section className="space-y-6 rounded border border-neutral-300 p-4 dark:border-neutral-700">
          <h3 className="text-sm font-medium">Confirmation checklist</h3>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewedNutrition}
              onChange={(e) => setReviewedNutrition(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            <span>
              I&apos;ve reviewed the estimated nutrition above for {selectedCandidate.label} and it
              looks right to me.
            </span>
          </label>

          <div className="space-y-3">
            <p className="text-sm font-medium">Blend, measure, and confirm volume</p>
            <label className="block text-sm">
              First blended volume (mL), before topping up with water
              <input
                type="number"
                min="0"
                step="any"
                value={currentBlendedVolumeMl}
                onChange={(e) => setCurrentBlendedVolumeMl(e.target.value)}
                className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            {waterTopUpResult && (
              <p className="text-sm text-neutral-500">{waterTopUpResult.note}</p>
            )}
            <label className="block text-sm">
              Final volume after topping up with water (mL)
              <input
                type="number"
                min="0"
                step="any"
                value={measuredFinalVolumeMl}
                onChange={(e) => setMeasuredFinalVolumeMl(e.target.value)}
                className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            {verifiedDensityResult && (
              <p
                className={
                  verifiedDensityResult.withinTolerance
                    ? "text-sm text-neutral-500"
                    : "text-sm text-amber-600 dark:text-amber-400"
                }
              >
                {verifiedDensityResult.note}
              </p>
            )}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={volumeConfirmed}
                disabled={!verifiedDensityResult}
                onChange={(e) => setVolumeConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              <span>I&apos;ve blended, measured, and confirmed the final volume above.</span>
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Perform the physical IDDSI flow test</p>
            <p className="text-sm text-neutral-500">
              Fill a 10 mL syringe (no plunger) with the blended recipe, let it flow under gravity
              for 10 seconds, and measure what remains. Do not estimate this from the ingredients.
            </p>
            <label className="block text-sm">
              Volume remaining after 10 seconds (mL)
              <input
                type="number"
                min="0"
                max="10"
                step="any"
                value={syringeRemainingVolumeMl}
                onChange={(e) => setSyringeRemainingVolumeMl(e.target.value)}
                className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            {iddsiComputed && (
              <div className="space-y-1 text-sm">
                <p className="text-neutral-500">{iddsiComputed.interpreted.note}</p>
                <p
                  className={
                    iddsiComputed.comparison.matches
                      ? "text-neutral-500"
                      : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {iddsiComputed.comparison.note}
                </p>
              </div>
            )}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={iddsiTestConfirmed}
                disabled={!iddsiComputed}
                onChange={(e) => setIddsiTestConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              <span>I&apos;ve performed the physical IDDSI flow test above.</span>
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={physicianReminderAcknowledged}
              onChange={(e) => setPhysicianReminderAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            <span>
              I understand I should check with the patient&apos;s physician or dietitian before
              starting or changing a tube feeding regimen.
            </span>
          </label>

          {allConfirmed && (
            <button
              type="button"
              onClick={handleFinish}
              className="rounded bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Finish
            </button>
          )}
        </section>
      )}

      {allConfirmed && selectedCandidate && verifiedDensityResult && iddsiComputed && (
        <RecipeCard
          intake={intake}
          candidate={selectedCandidate}
          verifiedDensity={verifiedDensityResult}
          iddsi={{
            levelName: iddsiComputed.interpreted.levelName,
            confirmedBySyringeTest: iddsiComputed.interpreted.confirmedBySyringeTest,
            matchesTarget: iddsiComputed.comparison.matches,
            note: iddsiComputed.comparison.note,
          }}
        />
      )}

      <button type="button" onClick={onBack} className="text-sm underline">
        Back
      </button>
    </div>
  );
}
