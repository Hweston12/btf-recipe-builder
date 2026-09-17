import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Step3SafetyRestrictions, { type Step3Output } from "./Step3SafetyRestrictions";

function renderStep(initialValues: Step3Output | null = null) {
  const onComplete = vi.fn();
  const onBack = vi.fn();
  render(
    <Step3SafetyRestrictions
      onComplete={onComplete}
      onBack={onBack}
      initialValues={initialValues}
    />
  );
  return { onComplete, onBack };
}

function submitted(onComplete: ReturnType<typeof vi.fn>) {
  return (onComplete.mock.calls[0][0] as Step3Output).medicalRestrictions;
}

function check(name: string) {
  fireEvent.click(screen.getByRole("checkbox", { name }));
}

function addTo(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("Step3SafetyRestrictions", () => {
  it("offers the nine major allergens plus gluten-free as checkboxes", () => {
    renderStep();

    for (const label of [
      "Milk",
      "Soy",
      "Wheat",
      "Egg",
      "Fish",
      "Shellfish",
      "Tree Nuts",
      "Peanuts",
      "Sesame",
      "Gluten-free",
    ]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });

  it("writes checked allergens into absoluteExclusions by label", () => {
    const { onComplete } = renderStep();

    check("Peanuts");
    check("Milk");
    submit();

    expect(submitted(onComplete).absoluteExclusions).toEqual(["Milk", "Peanuts"]);
  });

  it("maps gluten-free to the glutenFree flag rather than an exclusion", () => {
    const { onComplete } = renderStep();

    check("Gluten-free");
    submit();

    const restrictions = submitted(onComplete);
    expect(restrictions.glutenFree).toBe(true);
    expect(restrictions.absoluteExclusions).toEqual([]);
  });

  it("submits empty restrictions when nothing is chosen", () => {
    const { onComplete } = renderStep();

    submit();

    expect(submitted(onComplete)).toEqual({
      absoluteExclusions: [],
      glutenFree: false,
      foodsToLimit: [],
    });
  });

  it("does not offer a free-text allergen field", () => {
    renderStep();
    expect(screen.queryByLabelText("Other allergen or restriction")).not.toBeInTheDocument();
  });

  it("still collects foods to limit", () => {
    const { onComplete } = renderStep();

    addTo("Food to limit", "sodium");
    submit();

    expect(submitted(onComplete).foodsToLimit).toEqual(["sodium"]);
  });

  it("unchecking an allergen removes it again", () => {
    const { onComplete } = renderStep();

    check("Egg");
    check("Egg");
    submit();

    expect(submitted(onComplete).absoluteExclusions).toEqual([]);
  });

  it("restores checkboxes and limits from initialValues", () => {
    const initial: Step3Output = {
      medicalRestrictions: {
        absoluteExclusions: ["Milk"],
        glutenFree: true,
        foodsToLimit: ["sodium"],
      },
    };
    const { onComplete } = renderStep(initial);

    expect(screen.getByRole("checkbox", { name: "Milk" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Gluten-free" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Peanuts" })).not.toBeChecked();

    submit();

    expect(submitted(onComplete)).toEqual(initial.medicalRestrictions);
  });

  it("drops a legacy free-text exclusion that no longer matches a checkbox", () => {
    const initial: Step3Output = {
      medicalRestrictions: {
        absoluteExclusions: ["Milk", "corn"],
        glutenFree: false,
        foodsToLimit: [],
      },
    };
    const { onComplete } = renderStep(initial);

    submit();

    expect(submitted(onComplete).absoluteExclusions).toEqual(["Milk"]);
  });

  it("no longer renders a standalone gluten-free Other section", () => {
    renderStep();
    expect(screen.queryByText("Other")).not.toBeInTheDocument();
  });
});
