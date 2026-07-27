import { reconcilePrescription } from "@btf-recipe-builder/calculation";

export default function Home() {
  const result = reconcilePrescription({ caloriesKcal: 1400, densityKcalPerMl: 1.4 });

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-2xl font-medium">BTF Recipe Builder</h1>
        <p className="text-sm text-neutral-500">
          Workspace check: calculation package is wired up.
        </p>
        <p className="text-sm">
          1400 kcal at 1.4 kcal/mL &rarr; {result.finalVolumeMl} mL final volume
        </p>
      </div>
    </main>
  );
}
