import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Step5GenerateReview from "./Step5GenerateReview";
import type { PatientIntake } from "@btf-recipe-builder/schema";

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
  foodPreferences: { preferred: ["oats", "banana"], acceptable: [], useSparingly: [], excluded: [] },
  practicalConstraints: {
    maximumIngredients: 8,
    budgetLevel: "moderate",
    blenderType: "standard",
    preparationFrequency: "daily",
    cuisinePreferences: [],
  },
  feeding: { route: "gastrostomy", tubeSizeFr: 18, delivery: "bolus", historyOfClogging: false },
};

async function selectFirstCandidate() {
  const selectButtons = await screen.findAllByRole("button", { name: /select this recipe/i });
  fireEvent.click(selectButtons[0]);
}

describe("Step5GenerateReview", () => {
  it("shows a loading state before candidates arrive, then renders candidate cards", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText(/generating candidate recipes/i)).toBeInTheDocument();
    expect(await screen.findByText("Option 1")).toBeInTheDocument();
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

  it("disables the volume and IDDSI checkboxes until a valid measurement is entered", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    const volumeCheckbox = screen.getByRole("checkbox", {
      name: /blended, measured, and confirmed the final volume/i,
    });
    const iddsiCheckbox = screen.getByRole("checkbox", {
      name: /performed the physical iddsi flow test/i,
    });
    expect(volumeCheckbox).toBeDisabled();
    expect(iddsiCheckbox).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/final volume after topping up with water/i), {
      target: { value: "1200" },
    });
    fireEvent.change(screen.getByLabelText(/volume remaining after 10 seconds/i), {
      target: { value: "0" },
    });

    await waitFor(() => expect(volumeCheckbox).not.toBeDisabled());
    expect(iddsiCheckbox).not.toBeDisabled();
  });

  it("never auto-checks the volume checkbox, even when the measurement is out of tolerance", async () => {
    render(<Step5GenerateReview intake={intake} onComplete={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    // A tiny final volume relative to the recipe's calories pushes density far
    // outside the 10% tolerance — this must warn, not silently resolve or check the box.
    fireEvent.change(screen.getByLabelText(/final volume after topping up with water/i), {
      target: { value: "100" },
    });

    const volumeCheckbox = screen.getByRole("checkbox", {
      name: /blended, measured, and confirmed the final volume/i,
    });

    await waitFor(() => expect(volumeCheckbox).not.toBeDisabled());
    expect(volumeCheckbox).not.toBeChecked();
    expect(screen.getByText(/outside the 10% tolerance/i)).toBeInTheDocument();
  });

  it("does not call onComplete until all four confirmations are checked", async () => {
    const onComplete = vi.fn();
    render(<Step5GenerateReview intake={intake} onComplete={onComplete} onBack={vi.fn()} />);
    await screen.findByText("Option 1");
    await selectFirstCandidate();

    expect(screen.queryByRole("button", { name: /^finish$/i })).toBeNull();

    fireEvent.click(
      screen.getByRole("checkbox", { name: /reviewed the estimated nutrition/i })
    );
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

    const volumeCheckbox = screen.getByRole("checkbox", {
      name: /blended, measured, and confirmed the final volume/i,
    });
    const iddsiCheckbox = screen.getByRole("checkbox", {
      name: /performed the physical iddsi flow test/i,
    });
    await waitFor(() => expect(volumeCheckbox).not.toBeDisabled());

    // Still not complete — volume/IDDSI checkboxes require an explicit click too.
    expect(screen.queryByRole("button", { name: /^finish$/i })).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(volumeCheckbox);
    fireEvent.click(iddsiCheckbox);

    const finishButton = await screen.findByRole("button", { name: /^finish$/i });
    fireEvent.click(finishButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      selectedCandidateId: "candidate-1",
      reviewedNutrition: true,
      physicianReminderAcknowledged: true,
    });
  });
});
