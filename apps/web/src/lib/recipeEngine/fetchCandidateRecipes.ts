import type { PatientIntake } from "@btf-recipe-builder/schema";
import type { CandidateRecipe } from "./types";

/**
 * Client-side call to the server-side /api/generate-recipes route (see
 * ../../app/api/generate-recipes/route.ts). Throws on a non-ok response so a
 * failure surfaces as a real rejection rather than silently returning
 * nothing — CLAUDE.md's "nothing auto-advances" principle.
 */
export async function fetchCandidateRecipes(intake: PatientIntake): Promise<CandidateRecipe[]> {
  const response = await fetch("/api/generate-recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(intake),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to generate candidate recipes.");
  }

  return response.json();
}
