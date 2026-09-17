import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CandidateDetail from "./CandidateDetail";
import type { CandidateRecipe } from "@/lib/recipeEngine/types";

const candidate: CandidateRecipe = {
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
};

describe("CandidateDetail", () => {
  it("renders the full ingredient list", () => {
    render(<CandidateDetail candidate={candidate} />);

    expect(screen.getByText("Oats")).toBeInTheDocument();
    expect(screen.getByText("150 g")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("100 g")).toBeInTheDocument();
  });

  it("renders every nutrient row and the estimate disclaimer", () => {
    render(<CandidateDetail candidate={candidate} />);

    expect(screen.getByText(candidate.estimateDisclaimer)).toBeInTheDocument();
    for (const label of ["Calories", "Protein", "Carbohydrate", "Fat", "Fiber", "Fluid"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
