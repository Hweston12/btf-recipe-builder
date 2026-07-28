"use client";

import { useState } from "react";
import Step1NutritionBasics, { type Step1Output } from "./Step1NutritionBasics";
import Step2FeedingSetup, { type Step2Output } from "./Step2FeedingSetup";

export default function Wizard() {
  const [step1Output, setStep1Output] = useState<Step1Output | null>(null);
  const [step2Output, setStep2Output] = useState<Step2Output | null>(null);

  if (!step1Output) {
    return (
      <div className="mx-auto w-full max-w-md p-8">
        <h1 className="text-xl font-medium">Step 1 of 5 — Nutrition basics</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">
          Enter the patient&apos;s age, weight, and sex, plus any two of daily calories, target
          volume, or target density — we&apos;ll calculate the third.
        </p>
        <Step1NutritionBasics onComplete={setStep1Output} />
      </div>
    );
  }

  if (!step2Output) {
    return (
      <div className="mx-auto w-full max-w-md p-8">
        <h1 className="text-xl font-medium">Step 2 of 5 — Feeding setup</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">
          Enter the feeding tube details, feeds per day, and the IDDSI texture level your care
          team is targeting.
        </p>
        <Step2FeedingSetup
          onComplete={setStep2Output}
          onBack={() => setStep1Output(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-8">
      <h1 className="text-xl font-medium">Step 2 complete</h1>
      <p className="text-sm text-neutral-500">
        Steps 3&ndash;5 (safety &amp; restrictions, food preferences, and recipe generation)
        aren&apos;t built yet. Here&apos;s what was captured:
      </p>
      <pre className="overflow-x-auto rounded bg-neutral-100 p-4 text-xs dark:bg-neutral-800">
        {JSON.stringify({ step1Output, step2Output }, null, 2)}
      </pre>
      <button type="button" onClick={() => setStep2Output(null)} className="text-sm underline">
        Back
      </button>
    </div>
  );
}
