import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { evaluateMicronutrientIntake, MICRONUTRIENT_IDS } from "@btf-recipe-builder/calculation";
import type { MicronutrientEstimates } from "@btf-recipe-builder/calculation";
import MicronutrientReport from "./MicronutrientReport";

function estimatesWith(overrides: Partial<MicronutrientEstimates>): MicronutrientEstimates {
  return {
    ...(Object.fromEntries(MICRONUTRIENT_IDS.map((id) => [id, 0])) as MicronutrientEstimates),
    ...overrides,
  };
}

describe("MicronutrientReport", () => {
  it("renders every one of the 28 nutrients with the estimate disclaimer", () => {
    const analysis = evaluateMicronutrientIntake({
      estimates: estimatesWith({}),
      ageYears: 30,
      sexForDri: "female",
      goalPercentDri: 80,
      doNotExceedUl: true,
    });

    render(<MicronutrientReport analysis={analysis} estimateDisclaimer="Estimated." />);

    expect(screen.getByText("Estimated.")).toBeInTheDocument();
    expect(screen.getByText("Vitamin C")).toBeInTheDocument();
    expect(screen.getByText("Fluoride")).toBeInTheDocument();
    expect(screen.getAllByText("below goal").length).toBe(MICRONUTRIENT_IDS.length);
  });

  it("flags a nutrient meeting its goal distinctly from one below it", () => {
    // female-19-30 (packages/calculation/micronutrients.ts): vitamin C DRI is 75 mg.
    const analysis = evaluateMicronutrientIntake({
      estimates: estimatesWith({ vitaminCMg: 75 }),
      ageYears: 25,
      sexForDri: "female",
      goalPercentDri: 80,
      doNotExceedUl: true,
    });

    render(<MicronutrientReport analysis={analysis} estimateDisclaimer="Estimated." />);

    expect(screen.getAllByText("meets goal").length).toBe(1);
    expect(screen.getAllByText("below goal").length).toBe(MICRONUTRIENT_IDS.length - 1);
    expect(screen.getByText(/One or more nutrients fall below/)).toBeInTheDocument();
  });

  it("flags a nutrient exceeding its UL and surfaces the summary warning", () => {
    const analysis = evaluateMicronutrientIntake({
      estimates: estimatesWith({ vitaminCMg: 5000 }), // over the 2000 mg adult UL
      ageYears: 25,
      sexForDri: "female",
      goalPercentDri: 80,
      doNotExceedUl: true,
    });

    render(<MicronutrientReport analysis={analysis} estimateDisclaimer="Estimated." />);

    expect(screen.getAllByText("exceeds UL").length).toBe(1);
    expect(screen.getByText(/exceed their Tolerable Upper Intake Level/)).toBeInTheDocument();
  });

  it("shows no warning banners when every nutrient meets goal and none exceed UL", () => {
    const fullDose = estimatesWith({});
    // Set every nutrient's estimate high enough to clear a 0% goal, which is
    // trivially true for all-zero estimates too — use a 0% goal so an
    // all-zero recipe still "meets goal" and never exceeds UL.
    const analysis = evaluateMicronutrientIntake({
      estimates: fullDose,
      ageYears: 25,
      sexForDri: "female",
      goalPercentDri: 0,
      doNotExceedUl: true,
    });

    render(<MicronutrientReport analysis={analysis} estimateDisclaimer="Estimated." />);

    expect(screen.queryByText(/One or more nutrients fall below/)).toBeNull();
    expect(screen.queryByText(/exceed their Tolerable Upper Intake Level/)).toBeNull();
  });
});
