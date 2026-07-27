import assert from "node:assert/strict";
import {
  reconcilePrescription,
  calculateWaterTopUp,
  calculateVerifiedDensity,
  interpretIddsiFlowTest,
  compareToTargetIddsiLevel,
} from "./index";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  - ${name}`);
  } catch (err) {
    console.error(`FAIL  - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("reconcilePrescription");
test("calculates final volume from calories + density", () => {
  const r = reconcilePrescription({ caloriesKcal: 1400, densityKcalPerMl: 1.4 });
  assert.equal(r.finalVolumeMl, 1000);
  assert.equal(r.calculatedField, "finalVolumeMl");
});
test("calculates density from calories + volume", () => {
  const r = reconcilePrescription({ caloriesKcal: 1400, finalVolumeMl: 1000 });
  assert.equal(r.densityKcalPerMl, 1.4);
  assert.equal(r.calculatedField, "densityKcalPerMl");
});
test("calculates calories from volume + density", () => {
  const r = reconcilePrescription({ finalVolumeMl: 1000, densityKcalPerMl: 1.4 });
  assert.equal(r.caloriesKcal, 1400);
  assert.equal(r.calculatedField, "caloriesKcal");
});
test("flags inconsistent prescription (the doc's own example)", () => {
  // 1,400 kcal, 1,000 mL, 1.2 kcal/mL requested -> expected 1200 kcal, entered 1400 -> ~16.7% off
  const r = reconcilePrescription({ caloriesKcal: 1400, finalVolumeMl: 1000, densityKcalPerMl: 1.2 });
  assert.equal(r.calculatedField, "none");
  assert.ok(r.inconsistencyWarning, "expected an inconsistency warning");
});
test("does not flag consistent triple within tolerance", () => {
  const r = reconcilePrescription({ caloriesKcal: 1400, finalVolumeMl: 1000, densityKcalPerMl: 1.4 });
  assert.equal(r.inconsistencyWarning, undefined);
});
test("throws with fewer than two inputs", () => {
  assert.throws(() => reconcilePrescription({ caloriesKcal: 1400 }));
});
test("throws on non-positive values", () => {
  assert.throws(() => reconcilePrescription({ caloriesKcal: -100, finalVolumeMl: 1000 }));
});

console.log("calculateWaterTopUp");
test("returns water to add when under target", () => {
  const r = calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: 890 });
  assert.equal(r.waterToAddMl, 110);
  assert.equal(r.status, "add-water");
});
test("returns at-target when exactly matching", () => {
  const r = calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: 1000 });
  assert.equal(r.waterToAddMl, 0);
  assert.equal(r.status, "at-target");
});
test("flags already-over-target without adding negative water", () => {
  const r = calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: 1050 });
  assert.equal(r.waterToAddMl, 0);
  assert.equal(r.status, "already-over-target");
});
test("throws on invalid inputs", () => {
  assert.throws(() => calculateWaterTopUp({ targetFinalVolumeMl: 0, currentBlendedVolumeMl: 100 }));
  assert.throws(() => calculateWaterTopUp({ targetFinalVolumeMl: 1000, currentBlendedVolumeMl: -5 }));
});

console.log("calculateVerifiedDensity");
test("computes density within tolerance", () => {
  const r = calculateVerifiedDensity({
    totalCalories: 1400,
    measuredFinalVolumeMl: 1000,
    targetDensityKcalPerMl: 1.4,
  });
  assert.equal(r.verifiedDensityKcalPerMl, 1.4);
  assert.equal(r.withinTolerance, true);
});
test("flags density outside tolerance", () => {
  const r = calculateVerifiedDensity({
    totalCalories: 1400,
    measuredFinalVolumeMl: 1200, // density = 1.1667, target 1.4 -> ~16.7% below
    targetDensityKcalPerMl: 1.4,
  });
  assert.equal(r.withinTolerance, false);
  assert.ok(r.percentDeviationFromTarget < 0);
});
test("respects a custom tolerance", () => {
  const r = calculateVerifiedDensity({
    totalCalories: 1400,
    measuredFinalVolumeMl: 1050, // density ~1.333, ~4.76% below target
    targetDensityKcalPerMl: 1.4,
    tolerancePercent: 3,
  });
  assert.equal(r.withinTolerance, false);
  const r2 = calculateVerifiedDensity({
    totalCalories: 1400,
    measuredFinalVolumeMl: 1050,
    targetDensityKcalPerMl: 1.4,
    tolerancePercent: 10,
  });
  assert.equal(r2.withinTolerance, true);
});

console.log("interpretIddsiFlowTest");
test("0 mL remaining -> Level 0", () => {
  const r = interpretIddsiFlowTest({ remainingVolumeMl: 0 });
  assert.equal(r.level, 0);
  assert.equal(r.confirmedBySyringeTest, true);
});
test("3 mL remaining -> Level 1", () => {
  assert.equal(interpretIddsiFlowTest({ remainingVolumeMl: 3 }).level, 1);
});
test("4 mL remaining -> Level 1 (boundary)", () => {
  assert.equal(interpretIddsiFlowTest({ remainingVolumeMl: 4 }).level, 1);
});
test("6 mL remaining -> Level 2", () => {
  assert.equal(interpretIddsiFlowTest({ remainingVolumeMl: 6 }).level, 2);
});
test("9 mL remaining -> Level 3", () => {
  assert.equal(interpretIddsiFlowTest({ remainingVolumeMl: 9 }).level, 3);
});
test("10 mL remaining -> Level 4, flagged as unconfirmed by syringe test", () => {
  const r = interpretIddsiFlowTest({ remainingVolumeMl: 10 });
  assert.equal(r.level, 4);
  assert.equal(r.confirmedBySyringeTest, false);
});
test("throws for non-10mL syringe", () => {
  assert.throws(() => interpretIddsiFlowTest({ remainingVolumeMl: 5, syringeVolumeMl: 20 }));
});
test("throws for out-of-range remaining volume", () => {
  assert.throws(() => interpretIddsiFlowTest({ remainingVolumeMl: 11 }));
  assert.throws(() => interpretIddsiFlowTest({ remainingVolumeMl: -1 }));
});

console.log("compareToTargetIddsiLevel");
test("matches when equal", () => {
  assert.equal(compareToTargetIddsiLevel(2, 2).matches, true);
});
test("flags mismatch", () => {
  assert.equal(compareToTargetIddsiLevel(3, 2).matches, false);
});

console.log(`\n${passed} tests passed`);
