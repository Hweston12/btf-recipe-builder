import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { evaluateMicronutrientIntake, MICRONUTRIENT_IDS } from "@btf-recipe-builder/calculation";
import Step5GenerateReview from "./Step5GenerateReview";
import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";

const aiEstimatedMicronutrients = Object.fromEntries(
  MICRONUTRIENT_IDS.map((id) => [id, 0])
) as CandidateRecipe["aiEstimatedMicronutrients"];

function fixtureCandidates(): CandidateRecipe[] {
  return ["Option 1", "Option 2", "Option 3"].map((label, index) => ({
    id: `candidate-${index + 1}`,
    label,
    source: "ai_generated",
    ingredients: [
      { name: "Oats", grams: 150 },
      { name: "Banana", grams: 100 },
    ],
    aiEstimatedValues: {
      caloriesKcal: 1800,
      proteinGrams: 60,
      carbohydrateGrams: 220,
      fatGrams: 60,
      fiberGrams: 20,
      fluidMl: 1200,
      densityKcalPerMl: 1.5,
    },
    aiEstimatedMicronutrients,
    microNutrientAnalysis: evaluateMicronutrientIntake({
      estimates: aiEstimatedMicronutrients,
      ageYears: 45,
      sexForDri: "female",
      goalPercentDri: 100,
      doNotExceedUl: true,
    }),
    estimateDisclaimer: "Estimated — not a substitute for a verified nutrient analysis.",
    iddsiValidated: false,
  }));
}

const intake: PatientIntake = {
  patient: { ageYears: 45, sexForDri: "female", weightKg: 60 },
  prescription: {
    caloriesKcal: 1800,
    finalVolumeMl: 1200,
    targetDensityKcalPerMl: 1.5,
    feedsPerDay: 5,
    iddsiTarget: 0,
    macroTargets: {
      carbohydratePercent: [45, 55],
      fatPercent: [25, 35],
      proteinPercent: [15, 25],
    },
    micronutrientMinimumPercentDri: 100,
    doNotExceedUl: true,
  },
  medicalRestrictions: { absoluteExclusions: [], glutenFree: false, foodsToLimit: [] },
  foodPreferences: { preferred: ["oats", "banana"], acceptable: [], excluded: [] },
  practicalConstraints: {
    maximumIngredients: 8,
    blenderType: "standard",
  },
  feeding: { route: "gastrostomy", tubeSizeFr: 18, delivery: "bolus", historyOfClogging: false },
};

async function selectFirstCandidate() {
  const selectButtons = await screen.findAllByRole("button", { name: /select this recipe/i });
  fireEvent.click(selectButtons[0]);
}

describe("Step5GenerateReview", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(fixtureCandidates()), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state before candidates arrive, then renders candidate cards", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText(/generating candidate recipes/i)).toBeInTheDocument();
    expect(await screen.findByText("Option 1")).toBeInTheDocument();
  });

  it("shows a placeholder and no full nutrition detail before anything is selected", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");

    expect(
      screen.getByText(/select a recipe on the left to review it/i)
    ).toBeInTheDocument();
    // The compact picker shows calories inline, not a full per-nutrient breakdown.
    expect(screen.queryByText("Protein")).toBeNull();
    expect(screen.queryByText("Carbohydrate")).toBeNull();
  });

  it("shows full nutrition detail only for the selected candidate, not all three", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    // Exactly one full detail panel renders, not three.
    expect(screen.getAllByText("Protein")).toHaveLength(1);
    expect(screen.getAllByText("Carbohydrate")).toHaveLength(1);
    expect(
      screen.queryByText(/select a recipe on the left to review it/i)
    ).toBeNull();
  });

  it("switches the full detail panel when a different candidate is selected", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    const remainingSelectButtons = screen.getAllByRole("button", {
      name: /^select this recipe$/i,
    });
    fireEvent.click(remainingSelectButtons[0]);

    // Still exactly one full detail panel — it moved, not duplicated.
    expect(screen.getAllByText("Protein")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^selected$/i })).toBeInTheDocument();
  });

  it("hides the confirmation checklist until a candidate is selected", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");

    expect(screen.queryByRole("checkbox", { name: /reviewed the estimated nutrition/i })).toBeNull();

    await selectFirstCandidate();

    expect(
      screen.getByRole("checkbox", { name: /reviewed the estimated nutrition/i })
    ).toBeInTheDocument();
  });

  it("has no separate volume/IDDSI confirmation checkboxes — a valid measurement is the confirmation", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    expect(
      screen.queryByRole("checkbox", { name: /blended, measured, and confirmed the final volume/i })
    ).toBeNull();
    expect(
      screen.queryByRole("checkbox", { name: /performed the physical iddsi flow test/i })
    ).toBeNull();
    // The measurement fields and their computed feedback are still there.
    expect(screen.getByLabelText(/final volume after topping up with water/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/volume remaining after 10 seconds/i)).toBeInTheDocument();
  });

  it("has no Finish button — the checklist ends with the physician checkbox", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    expect(screen.queryByRole("button", { name: /^finish$/i })).toBeNull();
  });

  it("does not call onComplete until both measurements are valid, even with both boxes checked", async () => {
    const onComplete = vi.fn();
    render(<Step5GenerateReview intake={intake} onComplete={onComplete} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed the estimated nutrition/i }));
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /understand i should check with the patient's physician/i,
      })
    );
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/final volume after topping up with water/i), {
      target: { value: "1200" },
    });
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/volume remaining after 10 seconds/i), {
      target: { value: "0" },
    });

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("still calls onComplete when the volume measurement is out of tolerance, but shows a warning", async () => {
    const onComplete = vi.fn();
    render(<Step5GenerateReview intake={intake} onComplete={onComplete} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed the estimated nutrition/i }));
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /understand i should check with the patient's physician/i,
      })
    );
    // A tiny final volume relative to the recipe's calories pushes density far
    // outside the 10% tolerance — this must warn, not block completion.
    fireEvent.change(screen.getByLabelText(/final volume after topping up with water/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/volume remaining after 10 seconds/i), {
      target: { value: "0" },
    });

    expect(await screen.findByText(/outside the 10% tolerance/i)).toBeInTheDocument();
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("checking the last box (physician acknowledgment) is what triggers onComplete", async () => {
    const onComplete = vi.fn();
    render(<Step5GenerateReview intake={intake} onComplete={onComplete} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed the estimated nutrition/i }));
    fireEvent.change(screen.getByLabelText(/final volume after topping up with water/i), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByLabelText(/volume remaining after 10 seconds/i), {
      target: { value: "0" },
    });
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /understand i should check with the patient's physician/i,
      })
    );

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      selectedCandidateId: "candidate-1",
      reviewedNutrition: true,
      physicianReminderAcknowledged: true,
      volumeConfirmation: { measuredFinalVolumeMl: 1200 },
      iddsiConfirmation: { remainingVolumeMl: 0 },
    });
  });

  it("shows the recipe card once everything is confirmed", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    expect(screen.queryByRole("heading", { name: /recipe card/i })).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed the estimated nutrition/i }));
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /understand i should check with the patient's physician/i,
      })
    );
    fireEvent.change(screen.getByLabelText(/final volume after topping up with water/i), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByLabelText(/volume remaining after 10 seconds/i), {
      target: { value: "0" },
    });

    expect(await screen.findByRole("heading", { name: /recipe card/i })).toBeInTheDocument();
  });

  it("blurs a number field on scroll instead of letting the wheel change its value", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    const volumeInput = screen.getByLabelText(/final volume after topping up with water/i);
    volumeInput.focus();
    expect(volumeInput).toHaveFocus();

    fireEvent.wheel(volumeInput);

    expect(volumeInput).not.toHaveFocus();
  });

  it("surfaces a fetch failure as an error message instead of an endless loading state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Intake failed validation." }), { status: 400 })
      )
    );

    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/intake failed validation/i);
    expect(screen.queryByText("Option 1")).toBeNull();
    expect(screen.queryByText(/generating candidate recipes/i)).toBeNull();
  });
});
