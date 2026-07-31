"use client";

import { useState } from "react";
import Step1NutritionBasics, { type Step1Output } from "./Step1NutritionBasics";
import Step2FeedingSetup, { type Step2Output } from "./Step2FeedingSetup";
import Step3SafetyRestrictions, { type Step3Output } from "./Step3SafetyRestrictions";
import Step4FoodPreferences, { type Step4Output } from "./Step4FoodPreferences";

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [step1Output, setStep1Output] = useState<Step1Output | null>(null);
  const [step2Output, setStep2Output] = useState<Step2Output | null>(null);
  const [step3Output, setStep3Output] = useState<Step3Output | null>(null);
  const [step4Output, setStep4Output] = useState<Step4Output | null>(null);

  if (step === 1) {
    return (
      <div className="mx-auto w-full max-w-md p-8">
        <h1 className="text-xl font-medium">Step 1 of 5 — Nutrition basics</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">
          Enter the patient&apos;s age, weight, and sex, plus any two of daily calories, target
          volume, or target density
        </p>
        <Step1NutritionBasics
          initialValues={step1Output}
          onComplete={(output) => {
            setStep1Output(output);
            setStep(2);
          }}
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="mx-auto w-full max-w-md p-8">
        <h1 className="text-xl font-medium">Step 2 of 5 — Feeding setup</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">
          Enter the feeding tube details, feeds per day, and the IDDSI texture level your care
          team is targeting.
        </p>
        <Step2FeedingSetup
          initialValues={step2Output}
          onComplete={(output) => {
            setStep2Output(output);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="mx-auto w-full max-w-md p-8">
        <h1 className="text-xl font-medium">Step 3 of 5 — Safety &amp; restrictions</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">
          List any ingredients that must be excluded entirely, any that should be limited, and
          whether the recipe needs to be gluten-free.
        </p>
        <Step3SafetyRestrictions
          initialValues={step3Output}
          onComplete={(output) => {
            setStep3Output(output);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      </div>
    );
  }

  if (step === 4 && step3Output) {
    return (
      <div className="mx-auto w-full max-w-md p-8">
        <h1 className="text-xl font-medium">Step 4 of 5 — Food preferences &amp; practical constraints</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">
          Rate foods you prefer, tolerate, use sparingly, or want excluded, and set your budget,
          blender, prep frequency, and ingredient cap.
        </p>
        <Step4FoodPreferences
          medicalRestrictions={step3Output.medicalRestrictions}
          initialValues={step4Output}
          onComplete={(output) => {
            setStep4Output(output);
            setStep(5);
          }}
          onBack={() => setStep(3)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-8">
      <h1 className="text-xl font-medium">Step 4 complete</h1>
      <p className="text-sm text-neutral-500">
        Step 5 (generate &amp; review) isn&apos;t built yet. Here&apos;s what was captured:
      </p>
      <pre className="overflow-x-auto rounded bg-neutral-100 p-4 text-xs dark:bg-neutral-800">
        {JSON.stringify({ step1Output, step2Output, step3Output, step4Output }, null, 2)}
      </pre>
      <button type="button" onClick={() => setStep(4)} className="text-sm underline">
        Back
      </button>
    </div>
  );
}
