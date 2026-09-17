import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CandidateSummary from "./CandidateSummary";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";

function candidate(overrides: Partial<CandidateRecipe> = {}): CandidateRecipe {
  return {
    id: "candidate-1",
    label: "Option 1",
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
    estimateDisclaimer: "Estimated — not a substitute for a verified nutrient analysis.",
    iddsiValidated: false,
    ...overrides,
  };
}

describe("CandidateSummary", () => {
  it("shows the label, calories, and ingredient count, but no per-nutrient breakdown", () => {
    render(<CandidateSummary candidate={candidate()} selected={false} onSelect={vi.fn()} />);

    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText(/1800 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/2 ingredients/)).toBeInTheDocument();
    expect(screen.queryByText("Protein")).toBeNull();
  });

  it("shows an enabled 'Select this recipe' button when not selected", () => {
    const onSelect = vi.fn();
    render(<CandidateSummary candidate={candidate()} selected={false} onSelect={onSelect} />);

    const button = screen.getByRole("button", { name: /select this recipe/i });
    expect(button).toBeEnabled();
    button.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("shows a disabled 'Selected' button when selected", () => {
    render(<CandidateSummary candidate={candidate()} selected={true} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^selected$/i })).toBeDisabled();
  });
});
