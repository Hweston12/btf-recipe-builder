import { describe, expect, it } from "vitest";
import {
  ALLERGEN_OPTIONS,
  FOOD_CATALOG,
  allergenLabel,
  allergensFromRestrictions,
  findCatalogItem,
  findCatalogItemByName,
  foodsBlockedByAllergens,
  type Allergen,
} from "./foodCatalog";

const ALL_ITEMS = FOOD_CATALOG.flatMap((category) => category.items);
const ALLERGEN_IDS = new Set<string>(ALLERGEN_OPTIONS.map((option) => option.id));

describe("ALLERGEN_OPTIONS", () => {
  it("lists the nine major allergens plus gluten-free", () => {
    expect(ALLERGEN_OPTIONS.map((option) => option.label)).toEqual([
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
    ]);
  });
});

describe("FOOD_CATALOG integrity", () => {
  it("holds the expected number of foods in each category", () => {
    const counts = Object.fromEntries(
      FOOD_CATALOG.map((category) => [category.id, category.items.length])
    );

    expect(counts).toEqual({
      "liquid-base": 15,
      fruits: 30,
      vegetables: 30,
      protein: 30,
      grains: 30,
      fats: 30,
    });
  });

  it("uses a unique id for every food across all categories", () => {
    const ids = ALL_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses a unique display name for every food across all categories", () => {
    const names = ALL_ITEMS.map((item) => item.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("tags foods only with known allergens", () => {
    const unknown = ALL_ITEMS.flatMap((item) =>
      item.allergens.filter((allergen) => !ALLERGEN_IDS.has(allergen))
    );
    expect(unknown).toEqual([]);
  });

  it("uses kebab-case ids", () => {
    const malformed = ALL_ITEMS.filter((item) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id));
    expect(malformed).toEqual([]);
  });

  it("scopes the starchy-vegetables subgroup to the grains category", () => {
    for (const category of FOOD_CATALOG) {
      const subgrouped = category.items.filter((item) => item.subgroup !== undefined);
      if (category.id === "grains") {
        expect(subgrouped).toHaveLength(9);
        expect(new Set(subgrouped.map((item) => item.subgroup))).toEqual(
          new Set(["Starchy vegetables"])
        );
      } else {
        expect(subgrouped).toEqual([]);
      }
    }
  });

  it("offers a No preference opt-out only for the liquid base", () => {
    const opted = FOOD_CATALOG.filter((category) => category.allowsNoPreference);
    expect(opted.map((category) => category.id)).toEqual(["liquid-base"]);
  });

  it("asks for a detail only on commercial enteral formula", () => {
    const detailed = ALL_ITEMS.filter((item) => item.requiresDetail);
    expect(detailed.map((item) => item.id)).toEqual(["enteral-formula"]);
  });
});

describe("findCatalogItem", () => {
  it("finds a food by id", () => {
    expect(findCatalogItem("peanut-butter")?.name).toBe("Peanut butter");
  });

  it("returns undefined for an unknown id", () => {
    expect(findCatalogItem("nope")).toBeUndefined();
  });
});

describe("findCatalogItemByName", () => {
  it("resolves a display name case- and whitespace-insensitively", () => {
    expect(findCatalogItemByName("  greek YOGURT ")?.id).toBe("greek-yogurt");
  });

  it("returns undefined for a free-text food that isn't in the catalog", () => {
    expect(findCatalogItemByName("dragonfruit")).toBeUndefined();
  });
});

describe("foodsBlockedByAllergens", () => {
  it("returns nothing when no allergens are given", () => {
    expect(foodsBlockedByAllergens([])).toEqual([]);
  });

  it("blocks peanut foods for a peanut allergy without touching tree nuts", () => {
    const blocked = foodsBlockedByAllergens(["peanuts"]).map((item) => item.id);
    expect(blocked.sort()).toEqual(["peanut-butter", "peanuts"]);
  });

  it("blocks every dairy food for a milk allergy, including lactose-free milks", () => {
    const blocked = foodsBlockedByAllergens(["milk"]).map((item) => item.id);

    expect(blocked).toContain("lactose-free-whole-milk");
    expect(blocked).toContain("greek-yogurt");
    expect(blocked).toContain("cottage-cheese");
    expect(blocked).toContain("cheddar-cheese");
    expect(blocked).not.toContain("soy-milk");
  });

  it("blocks gluten-containing grains but not the explicitly gluten-free ones", () => {
    const blocked = foodsBlockedByAllergens(["gluten"]).map((item) => item.id);

    expect(blocked).toContain("whole-wheat-pasta");
    expect(blocked).toContain("barley");
    expect(blocked).toContain("old-fashioned-oats");
    expect(blocked).not.toContain("gluten-free-oats");
    expect(blocked).not.toContain("gluten-free-bread-pasta");
    expect(blocked).not.toContain("quinoa");
  });

  it("unions the blocked sets when several allergens are given", () => {
    const blocked = foodsBlockedByAllergens(["fish", "shellfish"]).map((item) => item.id);
    expect(blocked.sort()).toEqual(["salmon", "sardines", "shrimp", "tuna", "white-fish"]);
  });
});

describe("allergensFromRestrictions", () => {
  it("maps exclusion labels back to allergen ids", () => {
    const allergens = allergensFromRestrictions({
      absoluteExclusions: ["Peanuts", "Tree Nuts"],
      glutenFree: false,
    });
    expect(allergens.sort()).toEqual(["peanuts", "tree_nuts"]);
  });

  it("adds gluten when glutenFree is set", () => {
    expect(allergensFromRestrictions({ absoluteExclusions: [], glutenFree: true })).toEqual([
      "gluten",
    ]);
  });

  it("ignores free-text exclusions that aren't known allergens", () => {
    const allergens = allergensFromRestrictions({
      absoluteExclusions: ["corn", "Milk"],
      glutenFree: false,
    });
    expect(allergens).toEqual<Allergen[]>(["milk"]);
  });

  it("does not duplicate an allergen listed both ways", () => {
    const allergens = allergensFromRestrictions({
      absoluteExclusions: ["Gluten-free"],
      glutenFree: true,
    });
    expect(allergens).toEqual<Allergen[]>(["gluten"]);
  });
});

describe("allergenLabel", () => {
  it("returns the user-facing label", () => {
    expect(allergenLabel("tree_nuts")).toBe("Tree Nuts");
  });
});
