import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { MedicalRestrictions } from "@btf-recipe-builder/schema";
import Step4FoodPreferences, { type Step4Output } from "./Step4FoodPreferences";

function restrictions(
  absoluteExclusions: string[] = [],
  glutenFree = false,
  foodsToLimit: string[] = []
): MedicalRestrictions {
  return { absoluteExclusions, glutenFree, foodsToLimit };
}

function renderStep(
  medicalRestrictions: MedicalRestrictions = restrictions(),
  initialValues: Step4Output | null = null
) {
  const onComplete = vi.fn();
  const onBack = vi.fn();
  render(
    <Step4FoodPreferences
      medicalRestrictions={medicalRestrictions}
      initialValues={initialValues}
      onComplete={onComplete}
      onBack={onBack}
    />
  );
  return { onComplete, onBack };
}

/** Clicks one of a food's three rating radios by its accessible name. */
function rate(food: string, choice: "Preferred" | "Okay to use" | "Do not use") {
  fireEvent.click(screen.getByRole("radio", { name: `${food} — ${choice}` }));
}

function fillConstraints({ max = "6", blender = "high-powered" } = {}) {
  fireEvent.change(screen.getByLabelText("Maximum ingredients"), { target: { value: max } });
  fireEvent.change(screen.getByLabelText("Blender type"), { target: { value: blender } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

function detailsFor(categoryLabel: string): HTMLDetailsElement {
  const details = Array.from(document.querySelectorAll("details")).find((el) =>
    el.querySelector("summary")?.textContent?.startsWith(categoryLabel)
  );
  if (!details) throw new Error(`No <details> found for category "${categoryLabel}"`);
  return details as HTMLDetailsElement;
}

function clickSummary(categoryLabel: string) {
  fireEvent.click(detailsFor(categoryLabel).querySelector("summary")!);
}

function submitted(onComplete: ReturnType<typeof vi.fn>) {
  return onComplete.mock.calls[0][0] as Step4Output;
}

describe("Step4FoodPreferences", () => {
  it("renders every catalog category", () => {
    renderStep();

    for (const label of [
      "Preferred liquid base",
      "Fruits",
      "Vegetables",
      "Protein-rich foods & legumes",
      "Grains & starchy vegetables",
      "Healthy fats",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("routes each of the three ratings into the right array", () => {
    const { onComplete } = renderStep();

    rate("Banana", "Preferred");
    rate("Carrots", "Okay to use");
    rate("Broccoli", "Do not use");
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences).toEqual({
      preferred: ["Banana"],
      acceptable: ["Carrots"],
      excluded: ["Broccoli"],
    });
  });

  it("leaves unrated foods out of every array", () => {
    const { onComplete } = renderStep();

    rate("Banana", "Preferred");
    fillConstraints();
    submit();

    const { preferred, acceptable, excluded } = submitted(onComplete).foodPreferences;
    expect(preferred).toEqual(["Banana"]);
    expect(acceptable).toEqual([]);
    expect(excluded).toEqual([]);
  });

  it("clears a rating when the selected option is clicked again", () => {
    const { onComplete } = renderStep();

    rate("Banana", "Preferred");
    rate("Banana", "Preferred");
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences.preferred).toEqual([]);
  });

  it("changes a rating when a different option is clicked", () => {
    const { onComplete } = renderStep();

    rate("Banana", "Preferred");
    rate("Banana", "Do not use");
    fillConstraints();
    submit();

    const { preferred, excluded } = submitted(onComplete).foodPreferences;
    expect(preferred).toEqual([]);
    expect(excluded).toEqual(["Banana"]);
  });

  it("locks a food ruled out by an allergy and exposes no radios for it", () => {
    renderStep(restrictions(["Peanuts"]));

    expect(screen.getByText("Peanut butter")).toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Peanut butter — Preferred" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("excluded — peanuts allergy").length).toBeGreaterThan(0);
  });

  it("locks dairy foods for a milk allergy, including lactose-free milks", () => {
    renderStep(restrictions(["Milk"]));

    expect(screen.queryByRole("radio", { name: "Greek yogurt — Preferred" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Lactose-free whole milk — Preferred" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Chicken — Preferred" })).toBeInTheDocument();
  });

  it("locks gluten grains when gluten-free is set but leaves the gluten-free ones ratable", () => {
    renderStep(restrictions([], true));

    expect(
      screen.queryByRole("radio", { name: "Whole-wheat pasta — Preferred" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gluten-free oats — Preferred" })).toBeInTheDocument();
  });

  it("never submits a medically excluded food", () => {
    const { onComplete } = renderStep(restrictions(["Fish"]));

    rate("Chicken", "Preferred");
    fillConstraints();
    submit();

    const { preferred } = submitted(onComplete).foodPreferences;
    expect(preferred).toEqual(["Chicken"]);
    expect(preferred).not.toContain("Salmon");
  });

  it("disables Continue until maximum ingredients and blender type are both set", () => {
    renderStep();
    const button = screen.getByRole("button", { name: "Continue" });

    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Maximum ingredients"), { target: { value: "6" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Blender type"), { target: { value: "standard" } });
    expect(button).toBeEnabled();
  });

  it("rejects a non-positive maximum ingredients", () => {
    renderStep();

    fillConstraints({ max: "0" });

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("blurs the maximum ingredients field on scroll instead of letting the wheel change it", () => {
    renderStep();

    const input = screen.getByLabelText("Maximum ingredients");
    input.focus();
    expect(input).toHaveFocus();

    fireEvent.wheel(input);

    expect(input).not.toHaveFocus();
  });

  it("no longer asks for budget, prep frequency or cuisine", () => {
    renderStep();

    expect(screen.queryByLabelText("Budget")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Preparation frequency")).not.toBeInTheDocument();
    expect(screen.queryByText("Cuisine preferences")).not.toBeInTheDocument();
  });

  it("submits only the two remaining practical constraints", () => {
    const { onComplete } = renderStep();

    fillConstraints({ max: "7", blender: "standard" });
    submit();

    expect(submitted(onComplete).practicalConstraints).toEqual({
      maximumIngredients: 7,
      blenderType: "standard",
    });
  });

  it("adds a custom food from a category's Other field and rates it", () => {
    const { onComplete } = renderStep();

    const input = screen.getByLabelText("Other fruits");
    fireEvent.change(input, { target: { value: "Dragonfruit" } });
    fireEvent.keyDown(input, { key: "Enter" });

    rate("Dragonfruit", "Preferred");
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences.preferred).toEqual(["Dragonfruit"]);
  });

  it("removes a custom food and its rating", () => {
    const { onComplete } = renderStep();

    const input = screen.getByLabelText("Other fruits");
    fireEvent.change(input, { target: { value: "Dragonfruit" } });
    fireEvent.keyDown(input, { key: "Enter" });
    rate("Dragonfruit", "Preferred");

    fireEvent.click(screen.getByRole("button", { name: "Remove Dragonfruit" }));
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences.preferred).toEqual([]);
  });

  it("appends the formula name to commercial enteral formula", () => {
    const { onComplete } = renderStep();

    rate("Commercial enteral formula", "Preferred");
    fireEvent.change(screen.getByLabelText("Which formula?"), { target: { value: "Compleat" } });
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences.preferred).toEqual([
      "Commercial enteral formula — Compleat",
    ]);
  });

  it("only asks which formula once the formula is actually chosen", () => {
    renderStep();

    expect(screen.queryByLabelText("Which formula?")).not.toBeInTheDocument();
    rate("Commercial enteral formula", "Okay to use");
    expect(screen.getByLabelText("Which formula?")).toBeInTheDocument();
  });

  it("drops a category's ratings when No preference is checked", () => {
    const { onComplete } = renderStep();

    rate("Water", "Preferred");
    fireEvent.click(screen.getByRole("checkbox", { name: /No preference/ }));
    rate("Banana", "Preferred");
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences.preferred).toEqual(["Banana"]);
  });

  it("blocks Continue when a free-text exclusion contradicts a preference", () => {
    renderStep(restrictions(["Banana"]));

    rate("Banana", "Preferred");
    fillConstraints();

    expect(screen.getByText(/Resolve these conflicts before continuing/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("restores ratings, custom foods and constraints from initialValues", () => {
    const initial: Step4Output = {
      foodPreferences: {
        preferred: ["Banana", "Commercial enteral formula — Compleat"],
        acceptable: ["Carrots"],
        excluded: ["Dragonfruit"],
      },
      practicalConstraints: { maximumIngredients: 9, blenderType: "standard" },
    };
    const { onComplete } = renderStep(restrictions(), initial);

    expect(screen.getByRole("radio", { name: "Banana — Preferred" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Carrots — Okay to use" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dragonfruit — Do not use" })).toBeChecked();
    expect(screen.getByLabelText("Maximum ingredients")).toHaveValue(9);

    submit();

    const output = submitted(onComplete);
    expect(output.practicalConstraints).toEqual(initial.practicalConstraints);
    expect(output.foodPreferences.preferred.sort()).toEqual(initial.foodPreferences.preferred.sort());
    expect(output.foodPreferences.acceptable).toEqual(["Carrots"]);
    expect(output.foodPreferences.excluded).toEqual(["Dragonfruit"]);
  });

  it("separates starchy vegetables within the grains category", () => {
    renderStep();
    expect(screen.getByText("Starchy vegetables")).toBeInTheDocument();
  });

  it("opens the first category by default and the rest collapsed", () => {
    renderStep();

    expect(detailsFor("Preferred liquid base").open).toBe(true);
    expect(detailsFor("Fruits").open).toBe(false);
    expect(detailsFor("Vegetables").open).toBe(false);
  });

  it("closes the previously open category when another is opened", () => {
    renderStep();

    clickSummary("Fruits");

    expect(detailsFor("Fruits").open).toBe(true);
    expect(detailsFor("Preferred liquid base").open).toBe(false);
  });

  it("only ever has one category open, however many are clicked", () => {
    renderStep();

    clickSummary("Fruits");
    clickSummary("Vegetables");
    clickSummary("Healthy fats");

    expect(detailsFor("Healthy fats").open).toBe(true);
    expect(detailsFor("Fruits").open).toBe(false);
    expect(detailsFor("Vegetables").open).toBe(false);
    expect(detailsFor("Preferred liquid base").open).toBe(false);
  });

  it("allows collapsing the open category by clicking it again", () => {
    renderStep();

    clickSummary("Preferred liquid base");

    expect(detailsFor("Preferred liquid base").open).toBe(false);
  });

  it("keeps a category's ratings when it collapses", () => {
    const { onComplete } = renderStep();

    rate("Water", "Preferred");
    clickSummary("Fruits");
    fillConstraints();
    submit();

    expect(submitted(onComplete).foodPreferences.preferred).toEqual(["Water"]);
  });
});
