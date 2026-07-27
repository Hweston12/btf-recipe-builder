"use client";

import { useState } from "react";
import Step1NutritionBasics, { type Step1Output } from "./Step1NutritionBasics";

export default function Wizard() {
  const [step1Output, setStep1Output] = useState<Step1Output | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-8">
      <h1 className="text-xl font-medium">Step 1 complete</h1>
      <p className="text-sm text-neutral-500">
        Steps 2&ndash;5 (feeding setup, safety &amp; restrictions, food preferences, and recipe
        generation) aren&apos;t built yet. Here&apos;s what was captured:
      </p>
      <pre className="overflow-x-auto rounded bg-neutral-100 p-4 text-xs dark:bg-neutral-800">
        {JSON.stringify(step1Output, null, 2)}
      </pre>
      <button type="button" onClick={() => setStep1Output(null)} className="text-sm underline">
        Back
      </button>
    </div>
  );
}
