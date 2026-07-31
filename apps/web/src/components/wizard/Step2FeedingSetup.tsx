"use client";

import { useState } from "react";
import type { IddsiLevel } from "@btf-recipe-builder/calculation";
import type { Feeding, MacroTargets } from "@btf-recipe-builder/schema";

const IDDSI_TARGET_OPTIONS: { level: IddsiLevel; name: string }[] = [
  { level: 0, name: "Thin" },
  { level: 1, name: "Slightly thick" },
  { level: 2, name: "Mildly thick" },
  { level: 3, name: "Moderately thick" },
  { level: 4, name: "Extremely thick" },
];

export interface Step2Output {
  feeding: Feeding;
  prescriptionRest: {
    feedsPerDay: number;
    iddsiTarget: IddsiLevel;
    macroTargets: MacroTargets;
    micronutrientMinimumPercentDri: number;
    doNotExceedUl: boolean;
  };
}

interface Step2FeedingSetupProps {
  onComplete: (output: Step2Output) => void;
  onBack: () => void;
  initialValues?: Step2Output | null;
}

export default function Step2FeedingSetup({
  onComplete,
  onBack,
  initialValues,
}: Step2FeedingSetupProps) {
  const [route, setRoute] = useState<Feeding["route"] | "">(
    initialValues?.feeding.route ?? ""
  );
  const [tubeSizeFr, setTubeSizeFr] = useState(
    initialValues ? String(initialValues.feeding.tubeSizeFr) : ""
  );
  const [delivery, setDelivery] = useState<Feeding["delivery"] | "">(
    initialValues?.feeding.delivery ?? ""
  );
  const [historyOfClogging, setHistoryOfClogging] = useState(
    initialValues?.feeding.historyOfClogging ?? false
  );

  const [feedsPerDay, setFeedsPerDay] = useState(
    initialValues ? String(initialValues.prescriptionRest.feedsPerDay) : ""
  );
  const [iddsiTarget, setIddsiTarget] = useState<IddsiLevel | "">(
    initialValues?.prescriptionRest.iddsiTarget ?? ""
  );

  const [carbohydratePercentMin, setCarbohydratePercentMin] = useState(
    initialValues ? String(initialValues.prescriptionRest.macroTargets.carbohydratePercent[0]) : ""
  );
  const [carbohydratePercentMax, setCarbohydratePercentMax] = useState(
    initialValues ? String(initialValues.prescriptionRest.macroTargets.carbohydratePercent[1]) : ""
  );
  const [fatPercentMin, setFatPercentMin] = useState(
    initialValues ? String(initialValues.prescriptionRest.macroTargets.fatPercent[0]) : ""
  );
  const [fatPercentMax, setFatPercentMax] = useState(
    initialValues ? String(initialValues.prescriptionRest.macroTargets.fatPercent[1]) : ""
  );
  const [proteinPercentMin, setProteinPercentMin] = useState(
    initialValues ? String(initialValues.prescriptionRest.macroTargets.proteinPercent[0]) : ""
  );
  const [proteinPercentMax, setProteinPercentMax] = useState(
    initialValues ? String(initialValues.prescriptionRest.macroTargets.proteinPercent[1]) : ""
  );
  const [micronutrientMinimumPercentDri, setMicronutrientMinimumPercentDri] = useState(
    initialValues ? String(initialValues.prescriptionRest.micronutrientMinimumPercentDri) : "100"
  );
  const [doNotExceedUl, setDoNotExceedUl] = useState(
    initialValues?.prescriptionRest.doNotExceedUl ?? true
  );

  const parsedTubeSizeFr = Number(tubeSizeFr);
  const parsedFeedsPerDay = Number(feedsPerDay);

  const parsedCarbohydratePercentMin = Number(carbohydratePercentMin);
  const parsedCarbohydratePercentMax = Number(carbohydratePercentMax);
  const parsedFatPercentMin = Number(fatPercentMin);
  const parsedFatPercentMax = Number(fatPercentMax);
  const parsedProteinPercentMin = Number(proteinPercentMin);
  const parsedProteinPercentMax = Number(proteinPercentMax);
  const parsedMicronutrientMinimumPercentDri = Number(micronutrientMinimumPercentDri);

  const feedingValid =
    route !== "" &&
    tubeSizeFr.trim() !== "" &&
    Number.isFinite(parsedTubeSizeFr) &&
    parsedTubeSizeFr > 0 &&
    delivery !== "";

  function isValidPercentRange(min: string, max: string, parsedMin: number, parsedMax: number) {
    return (
      min.trim() !== "" &&
      max.trim() !== "" &&
      Number.isFinite(parsedMin) &&
      Number.isFinite(parsedMax) &&
      parsedMin >= 0 &&
      parsedMax <= 100 &&
      parsedMin <= parsedMax
    );
  }

  const macroTargetsValid =
    isValidPercentRange(
      carbohydratePercentMin,
      carbohydratePercentMax,
      parsedCarbohydratePercentMin,
      parsedCarbohydratePercentMax
    ) &&
    isValidPercentRange(fatPercentMin, fatPercentMax, parsedFatPercentMin, parsedFatPercentMax) &&
    isValidPercentRange(
      proteinPercentMin,
      proteinPercentMax,
      parsedProteinPercentMin,
      parsedProteinPercentMax
    );

  const prescriptionRestValid =
    feedsPerDay.trim() !== "" &&
    Number.isFinite(parsedFeedsPerDay) &&
    parsedFeedsPerDay > 0 &&
    iddsiTarget !== "" &&
    macroTargetsValid &&
    micronutrientMinimumPercentDri.trim() !== "" &&
    Number.isFinite(parsedMicronutrientMinimumPercentDri) &&
    parsedMicronutrientMinimumPercentDri > 0;

  const canContinue = feedingValid && prescriptionRestValid;

  function handleContinue() {
    if (!canContinue) return;
    onComplete({
      feeding: {
        route,
        tubeSizeFr: parsedTubeSizeFr,
        delivery,
        historyOfClogging,
      },
      prescriptionRest: {
        feedsPerDay: parsedFeedsPerDay,
        iddsiTarget,
        macroTargets: {
          carbohydratePercent: [parsedCarbohydratePercentMin, parsedCarbohydratePercentMax],
          fatPercent: [parsedFatPercentMin, parsedFatPercentMax],
          proteinPercent: [parsedProteinPercentMin, parsedProteinPercentMax],
        },
        micronutrientMinimumPercentDri: parsedMicronutrientMinimumPercentDri,
        doNotExceedUl,
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
        <legend className="text-sm font-medium">Feeding tube</legend>

        <label className="block text-sm">
          Route
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value as Feeding["route"] | "")}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            <option value="gastrostomy">Gastrostomy (G-tube)</option>
            <option value="jejunostomy">Jejunostomy (J-tube)</option>
            <option value="nasogastric">Nasogastric (NG-tube)</option>
            <option value="nasojejunal">Nasojejunal (NJ-tube)</option>
          </select>
        </label>

        <label className="block text-sm">
          Tube size (Fr)
          <input
            type="number"
            min="0"
            step="any"
            value={tubeSizeFr}
            onChange={(e) => setTubeSizeFr(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Delivery method
          <select
            value={delivery}
            onChange={(e) => setDelivery(e.target.value as Feeding["delivery"] | "")}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            <option value="bolus">Bolus (syringe/gravity)</option>
            <option value="pump">Pump</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={historyOfClogging}
            onChange={(e) => setHistoryOfClogging(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
          />
          History of tube clogging
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Feeds &amp; texture</legend>

        <label className="block text-sm">
          Feeds per day
          <input
            type="number"
            min="0"
            step="1"
            value={feedsPerDay}
            onChange={(e) => setFeedsPerDay(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="block text-sm">
          Target IDDSI level
          <select
            value={iddsiTarget}
            onChange={(e) =>
              setIddsiTarget(e.target.value === "" ? "" : (Number(e.target.value) as IddsiLevel))
            }
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Select&hellip;</option>
            {IDDSI_TARGET_OPTIONS.map(({ level, name }) => (
              <option key={level} value={level}>
                Level {level} &mdash; {name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-neutral-500">
        </p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Macro &amp; micronutrient targets</legend>
        <p className="text-sm text-neutral-500">
          Percent of total calories, as a min&ndash;max range for each macronutrient.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Carbohydrate % (min)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={carbohydratePercentMin}
              onChange={(e) => setCarbohydratePercentMin(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="block text-sm">
            Carbohydrate % (max)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={carbohydratePercentMax}
              onChange={(e) => setCarbohydratePercentMax(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>

          <label className="block text-sm">
            Fat % (min)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={fatPercentMin}
              onChange={(e) => setFatPercentMin(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="block text-sm">
            Fat % (max)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={fatPercentMax}
              onChange={(e) => setFatPercentMax(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>

          <label className="block text-sm">
            Protein % (min)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={proteinPercentMin}
              onChange={(e) => setProteinPercentMin(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="block text-sm">
            Protein % (max)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={proteinPercentMax}
              onChange={(e) => setProteinPercentMax(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        {!macroTargetsValid &&
          [carbohydratePercentMin, carbohydratePercentMax, fatPercentMin, fatPercentMax, proteinPercentMin, proteinPercentMax].some(
            (v) => v.trim() !== ""
          ) && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Each range needs a min and max between 0 and 100, with min &le; max.
            </p>
          )}

        <label className="block text-sm">
          Micronutrient minimum (% of DRI)
          <input
            type="number"
            min="0"
            step="any"
            value={micronutrientMinimumPercentDri}
            onChange={(e) => setMicronutrientMinimumPercentDri(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={doNotExceedUl}
            onChange={(e) => setDoNotExceedUl(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
          />
          Do not exceed tolerable upper limits for any micronutrient
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
