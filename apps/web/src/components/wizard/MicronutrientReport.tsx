import type { MicronutrientAnalysisResult } from "@btf-recipe-builder/calculation";

interface MicronutrientReportProps {
  analysis: MicronutrientAnalysisResult;
  estimateDisclaimer: string;
}

/**
 * Renders the 28-nutrient DRI%/UL report for one candidate recipe. Flag-only, matching the
 * project's "nothing auto-advances" principle already used for IDDSI: every nutrient is shown
 * regardless of status, and a shortfall or UL breach is highlighted for the user/clinician to
 * review, never filtered out or hidden here.
 */
export default function MicronutrientReport({ analysis, estimateDisclaimer }: MicronutrientReportProps) {
  return (
    <section className="space-y-2 rounded border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <p className="font-medium">
        Vitamins &amp; minerals &mdash; goal: {analysis.goalPercentDri}% of DRI
      </p>
      <p className="text-neutral-500">{estimateDisclaimer}</p>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {analysis.entries.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1">
            <span>{entry.label}</span>
            <span className="flex items-baseline gap-2">
              <span>
                {entry.estimatedAmount} {entry.unit} ({entry.percentOfDri}% of DRI)
              </span>
              {entry.exceedsUl ? (
                <span className="text-amber-600 dark:text-amber-400">exceeds UL</span>
              ) : !entry.meetsGoal ? (
                <span className="text-amber-600 dark:text-amber-400">below goal</span>
              ) : (
                <span className="text-neutral-500">meets goal</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {!analysis.allMeetGoal && (
        <p className="text-amber-600 dark:text-amber-400">
          One or more nutrients fall below the {analysis.goalPercentDri}% DRI goal.
        </p>
      )}
      {analysis.anyExceedsUl && (
        <p className="text-amber-600 dark:text-amber-400">
          One or more nutrients exceed their Tolerable Upper Intake Level.
        </p>
      )}
    </section>
  );
}
