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
import { blurNumberInputOnWheel } from "@/lib/blurNumberInputOnWheel";
import { fetchCandidateRecipes } from "@/lib/recipeEngine/fetchCandidateRecipes";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";
import CandidateDetail from "./CandidateDetail";
import CandidateSummary from "./CandidateSummary";
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

  const [syringeRemainingVolumeMl, setSyringeRemainingVolumeMl] = useState(
    initialValues ? String(initialValues.iddsiConfirmation.remainingVolumeMl) : ""
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

  // A valid measurement is the confirmation: calculateVerifiedDensity/interpretIddsiFlowTest
  // only produce a result from a real number the family typed in, which they can only have
  // if they actually blended-and-measured or ran the syringe test — no separate checkbox
  // needed on top of that. Still gated on presence, not on being within tolerance: an
  // out-of-tolerance or off-target result is shown as a warning note, not blocked, matching
  // how the checkbox this replaces was only ever disabled by a missing measurement.
  const volumeConfirmed = verifiedDensityResult !== null;
  const iddsiTestConfirmed = iddsiComputed !== null;

  const allConfirmed =
    reviewedNutrition && volumeConfirmed && iddsiTestConfirmed && physicianReminderAcknowledged;

  // No separate Finish button: the last checkbox (physician/dietitian acknowledgment) is
  // itself the explicit confirming action, the same way a valid measurement stands in for
  // the volume/IDDSI checkboxes above. Reporting completion is still gated on every
  // confirmation, not a silent auto-advance — it only fires once the family has actually
  // ticked that last box.
  useEffect(() => {
    if (!allConfirmed || !selectedCandidate || !verifiedDensityResult || !iddsiComputed) {
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
    // Re-fires if a confirmed value changes after the fact (e.g. re-measuring), which is
    // correct — onComplete should always reflect the latest confirmed state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConfirmed, selectedCandidate, verifiedDensityResult, iddsiComputed]);

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
      <div className="grid grid-cols-1 items-start gap-6 print:block lg:grid-cols-[280px_1fr]">
        <section className="space-y-4">
          <h3 className="text-sm font-medium">Candidate recipes</h3>
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <CandidateSummary
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === selectedCandidateId}
                onSelect={() => setSelectedCandidateId(candidate.id)}
              />
            ))}
          </div>
        </section>

        {selectedCandidate ? (
          <div className="space-y-6">
            <CandidateDetail candidate={selectedCandidate} />

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
                  I&apos;ve reviewed the estimated nutrition above for {selectedCandidate.label} and
                  it looks right to me.
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
                    onWheel={blurNumberInputOnWheel}
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
                    onWheel={blurNumberInputOnWheel}
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
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Perform the physical IDDSI flow test</p>
                <p className="text-sm text-neutral-500">
                  Fill a 10 mL syringe (no plunger) with the blended recipe, let it flow under
                  gravity for 10 seconds, and measure what remains. Do not estimate this from the
                  ingredients.
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
                    onWheel={blurNumberInputOnWheel}
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
            </section>

            {allConfirmed && verifiedDensityResult && iddsiComputed && (
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
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Select a recipe on the left to review it and confirm it&apos;s ready to use.
          </p>
        )}
      </div>

      <button type="button" onClick={onBack} className="text-sm underline">
        Back
      </button>
    </div>
  );
}
