import { describe, it, expect } from "vitest";
import {
  reconcilePrescription,
  calculateWaterTopUp,
  calculateVerifiedDensity,
  interpretIddsiFlowTest,
  compareToTargetIddsiLevel,
} from "./index";

describe("reconcilePrescription", () => {
  it("calculates final volume from calories + density", () => {
    const r = reconcilePrescription({ caloriesKcal: 1400, densityKcalPerMl: 1.4 });
    expect(r.finalVolumeMl).toBe(1000);
    expect(r.calculatedField).toBe("finalVolumeMl");
  });

  it("calculates density from calories + volume", () => {
    const r = reconcilePrescription({ caloriesKcal: 1400, finalVolumeMl: 1000 });
    expect(r.densityKcalPerMl).toBe(1.4);
    expect(r.calculatedField).toBe("densityKcalPerMl");
  });

  it("calculates calories from volume + density", () => {
    const r = reconcilePrescription({ finalVolumeMl: 1000, densityKcalPerMl: 1.4 });
    expect(r.caloriesKcal).toBe(1400);
    expect(r.calculatedField).toBe("caloriesKcal");
  });

  it("flags inconsistent prescription (the doc's own example)", () => {
    // 1,400 kcal, 1,000 mL, 1.2 kcal/mL requested -> expected 1200 kcal, entered 1400 -> ~16.7% off
    const r = reconcilePrescription({ caloriesKcal: 1400, finalVolumeMl: 1000, densityKcalPerMl: 1.2 });
    expect(r.calculatedField).toBe("none");
    expect(r.inconsistencyWarning).toBeTruthy();
  });

  it("does not flag consistent triple within tolerance", () => {
    const r = reconcilePrescription({ caloriesKcal: 1400, finalVolumeMl: 1000, densityKcalPerMl: 1.4 });
    expect(r.inconsistencyWarning).toBeUndefined();
  });

  it("throws with fewer than two inputs", () => {
    expect(() => reconcilePrescription({ caloriesKcal: 1400 })).toThrow();
  });

  it("throws on non-positive values", () => {
    expect(() => reconcilePrescription({ caloriesKcal: -100, finalVolumeMl: 1000 })).toThrow();
  });
});

describe("calculateWaterTopUp", () => {
  it("returns water to add when under target", () => {
    const r = calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: 890 });
    expect(r.waterToAddMl).toBe(110);
    expect(r.status).toBe("add-water");
  });

  it("returns at-target when exactly matching", () => {
    const r = calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: 1000 });
    expect(r.waterToAddMl).toBe(0);
    expect(r.status).toBe("at-target");
  });

  it("flags already-over-target without adding negative water", () => {
    const r = calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: 1050 });
    expect(r.waterToAddMl).toBe(0);
    expect(r.status).toBe("already-over-target");
  });

  it("throws on invalid inputs", () => {
    expect(() => calculateWaterTopUp({ targetFinalVolumeMl: 0, currentBlendedVolumeMl: 100 })).toThrow();
    expect(() => calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: -5 })).toThrow();
  });
});

describe("calculateVerifiedDensity", () => {
  it("computes density within tolerance", () => {
    const r = calculateVerifiedDensity({
      totalCalories: 1400,
      measuredFinalVolumeMl: 1000,
      targetDensityKcalPerMl: 1.4,
    });
    expect(r.verifiedDensityKcalPerMl).toBe(1.4);
    expect(r.withinTolerance).toBe(true);
  });

  it("flags density outside tolerance", () => {
    const r = calculateVerifiedDensity({
      totalCalories: 1400,
      measuredFinalVolumeMl: 1200, // density = 1.1667, target 1.4 -> ~16.7% below
      targetDensityKcalPerMl: 1.4,
    });
    expect(r.withinTolerance).toBe(false);
    expect(r.percentDeviationFromTarget).toBeLessThan(0);
  });

  it("respects a custom tolerance", () => {
    const r = calculateVerifiedDensity({
      totalCalories: 1400,
      measuredFinalVolumeMl: 1050, // density ~1.333, ~4.76% below target
      targetDensityKcalPerMl: 1.4,
      tolerancePercent: 3,
    });
    expect(r.withinTolerance).toBe(false);

    const r2 = calculateVerifiedDensity({
      totalCalories: 1400,
      measuredFinalVolumeMl: 1050,
      targetDensityKcalPerMl: 1.4,
      tolerancePercent: 10,
    });
    expect(r2.withinTolerance).toBe(true);
  });
});

describe("interpretIddsiFlowTest", () => {
  it("0 mL remaining -> Level 0", () => {
    const r = interpretIddsiFlowTest({ remainingVolumeMl: 0 });
    expect(r.level).toBe(0);
    expect(r.confirmedBySyringeTest).toBe(true);
  });

  it("3 mL remaining -> Level 1", () => {
    expect(interpretIddsiFlowTest({ remainingVolumeMl: 3 }).level).toBe(1);
  });

  it("4 mL remaining -> Level 1 (boundary)", () => {
    expect(interpretIddsiFlowTest({ remainingVolumeMl: 4 }).level).toBe(1);
  });

  it("6 mL remaining -> Level 2", () => {
    expect(interpretIddsiFlowTest({ remainingVolumeMl: 6 }).level).toBe(2);
  });

  it("9 mL remaining -> Level 3", () => {
    expect(interpretIddsiFlowTest({ remainingVolumeMl: 9 }).level).toBe(3);
  });

  it("10 mL remaining -> Level 4, flagged as unconfirmed by syringe test", () => {
    const r = interpretIddsiFlowTest({ remainingVolumeMl: 10 });
    expect(r.level).toBe(4);
    expect(r.confirmedBySyringeTest).toBe(false);
  });

  it("throws for non-10mL syringe", () => {
    expect(() => interpretIddsiFlowTest({ remainingVolumeMl: 5, syringeVolumeMl: 20 })).toThrow();
  });

  it("throws for out-of-range remaining volume", () => {
    expect(() => interpretIddsiFlowTest({ remainingVolumeMl: 11 })).toThrow();
    expect(() => interpretIddsiFlowTest({ remainingVolumeMl: -1 })).toThrow();
  });
});

describe("compareToTargetIddsiLevel", () => {
  it("matches when equal", () => {
    expect(compareToTargetIddsiLevel(2, 2).matches).toBe(true);
  });

  it("flags mismatch", () => {
    expect(compareToTargetIddsiLevel(3, 2).matches).toBe(false);
  });
});
