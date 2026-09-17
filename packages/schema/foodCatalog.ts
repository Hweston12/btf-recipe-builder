/**
 * The closed food vocabulary the wizard offers and the recipe engine optimizes
 * over. Lives in packages/schema rather than apps/web because the allergen →
 * food mapping is a safety rule: the server-side /api/generate-recipes route
 * re-validates against it, so it can't be a client-only data file.
 *
 * Pure data, dependency-free — same reasoning as the rest of this package.
 *
 * Allergen tagging note: a tag means "this food contains that allergen", which
 * is stricter than intolerance. Lactose-free milks are still tagged `milk`,
 * because a milk allergy is a protein allergy and removing lactose doesn't
 * change that.
 */

/** The FDA's nine major allergens, plus gluten as a tenth restriction. */
export type Allergen =
  | "milk"
  | "soy"
  | "wheat"
  | "egg"
  | "fish"
  | "shellfish"
  | "tree_nuts"
  | "peanuts"
  | "sesame"
  | "gluten";

export interface AllergenOption {
  id: Allergen;
  /**
   * The user-facing label. This exact string is what Step 3 writes into
   * MedicalRestrictions.absoluteExclusions, so it doubles as the wire format —
   * see allergensFromRestrictions.
   */
  label: string;
}

/**
 * Gluten is deliberately last and handled differently downstream: it maps to
 * MedicalRestrictions.glutenFree rather than into absoluteExclusions, since
 * it's a diet flag rather than an ingredient.
 */
export const ALLERGEN_OPTIONS: readonly AllergenOption[] = Object.freeze([
  { id: "milk", label: "Milk" },
  { id: "soy", label: "Soy" },
  { id: "wheat", label: "Wheat" },
  { id: "egg", label: "Egg" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "tree_nuts", label: "Tree Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "sesame", label: "Sesame" },
  { id: "gluten", label: "Gluten-free" },
] as const);

export interface FoodCatalogItem {
  /** Stable kebab-case identifier. Never reuse an id for a different food. */
  id: string;
  /** Display name, and the exact string written into FoodPreferences. */
  name: string;
  /** Allergens this food contains. Empty for most items. */
  allergens: Allergen[];
  /**
   * Optional visual grouping within a category. Used only by the grains
   * category, to separate starchy vegetables from grains proper — families
   * should still recognize potatoes and corn as vegetables even though
   * they're listed here as carbohydrate sources.
   */
  subgroup?: string;
  /**
   * Prompts for a free-text detail when selected (commercial enteral formula
   * needs a specific product name to be actionable).
   */
  requiresDetail?: boolean;
}

export type FoodCategoryId =
  | "liquid-base"
  | "fruits"
  | "vegetables"
  | "protein"
  | "grains"
  | "fats";

export interface FoodCatalogCategory {
  id: FoodCategoryId;
  label: string;
  helpText: string;
  /** Offers a "No preference" opt-out for the whole category. Liquid base only. */
  allowsNoPreference?: boolean;
  items: FoodCatalogItem[];
}

const LIQUID_BASE: FoodCatalogItem[] = [
  { id: "water", name: "Water", allergens: [] },
  { id: "whole-cows-milk", name: "Whole cow's milk", allergens: ["milk"] },
  { id: "two-percent-cows-milk", name: "2% cow's milk", allergens: ["milk"] },
  { id: "skim-milk", name: "Skim milk", allergens: ["milk"] },
  { id: "lactose-free-whole-milk", name: "Lactose-free whole milk", allergens: ["milk"] },
  { id: "lactose-free-two-percent-milk", name: "Lactose-free 2% milk", allergens: ["milk"] },
  { id: "lactose-free-skim-milk", name: "Lactose-free skim milk", allergens: ["milk"] },
  { id: "soy-milk", name: "Fortified unsweetened soy milk", allergens: ["soy"] },
  { id: "oat-milk", name: "Fortified unsweetened oat milk", allergens: ["gluten"] },
  { id: "almond-milk", name: "Fortified unsweetened almond milk", allergens: ["tree_nuts"] },
  { id: "pea-protein-milk", name: "Fortified unsweetened pea-protein milk", allergens: [] },
  { id: "coconut-milk-beverage", name: "Coconut milk beverage", allergens: [] },
  { id: "fruit-juice", name: "100% fruit juice", allergens: [] },
  { id: "low-sodium-broth", name: "Low-sodium broth", allergens: [] },
  {
    id: "enteral-formula",
    name: "Commercial enteral formula",
    allergens: [],
    requiresDetail: true,
  },
];

const FRUITS: FoodCatalogItem[] = [
  { id: "apple", name: "Apple", allergens: [] },
  { id: "banana", name: "Banana", allergens: [] },
  { id: "blueberries", name: "Blueberries", allergens: [] },
  { id: "strawberries", name: "Strawberries", allergens: [] },
  { id: "raspberries", name: "Raspberries", allergens: [] },
  { id: "blackberries", name: "Blackberries", allergens: [] },
  { id: "grapes", name: "Grapes", allergens: [] },
  { id: "pear", name: "Pear", allergens: [] },
  { id: "peach", name: "Peach", allergens: [] },
  { id: "nectarine", name: "Nectarine", allergens: [] },
  { id: "plum", name: "Plum", allergens: [] },
  { id: "apricot", name: "Apricot", allergens: [] },
  { id: "mango", name: "Mango", allergens: [] },
  { id: "pineapple", name: "Pineapple", allergens: [] },
  { id: "papaya", name: "Papaya", allergens: [] },
  { id: "kiwi", name: "Kiwi", allergens: [] },
  { id: "orange", name: "Orange", allergens: [] },
  { id: "unsweetened-applesauce", name: "Unsweetened applesauce", allergens: [] },
  { id: "sweetened-applesauce", name: "Sweetened applesauce", allergens: [] },
  { id: "mixed-fruit", name: "Mixed fruit", allergens: [] },
  { id: "watermelon", name: "Watermelon", allergens: [] },
  { id: "cantaloupe", name: "Cantaloupe", allergens: [] },
  { id: "honeydew", name: "Honeydew", allergens: [] },
  { id: "cherries", name: "Cherries", allergens: [] },
  { id: "pomegranate", name: "Pomegranate", allergens: [] },
  { id: "prunes", name: "Prunes", allergens: [] },
  { id: "dates", name: "Dates", allergens: [] },
  { id: "raisins", name: "Raisins", allergens: [] },
  { id: "figs", name: "Figs", allergens: [] },
  { id: "dried-cranberries", name: "Dried cranberries", allergens: [] },
];

const VEGETABLES: FoodCatalogItem[] = [
  { id: "carrots", name: "Carrots", allergens: [] },
  { id: "spinach", name: "Spinach", allergens: [] },
  { id: "kale", name: "Kale", allergens: [] },
  { id: "broccoli", name: "Broccoli", allergens: [] },
  { id: "cauliflower", name: "Cauliflower", allergens: [] },
  { id: "green-beans", name: "Green beans", allergens: [] },
  { id: "peas", name: "Peas", allergens: [] },
  { id: "zucchini", name: "Zucchini", allergens: [] },
  { id: "yellow-squash", name: "Yellow squash", allergens: [] },
  { id: "butternut-squash", name: "Butternut squash", allergens: [] },
  { id: "acorn-squash", name: "Acorn squash", allergens: [] },
  { id: "pumpkin", name: "Pumpkin", allergens: [] },
  { id: "tomatoes", name: "Tomatoes", allergens: [] },
  { id: "bell-peppers", name: "Bell peppers", allergens: [] },
  { id: "cucumbers", name: "Cucumbers", allergens: [] },
  { id: "celery", name: "Celery", allergens: [] },
  { id: "beets", name: "Beets", allergens: [] },
  { id: "asparagus", name: "Asparagus", allergens: [] },
  { id: "brussels-sprouts", name: "Brussels sprouts", allergens: [] },
  { id: "cabbage", name: "Cabbage", allergens: [] },
  { id: "bok-choy", name: "Bok choy", allergens: [] },
  { id: "collard-greens", name: "Collard greens", allergens: [] },
  { id: "swiss-chard", name: "Swiss chard", allergens: [] },
  { id: "mushrooms", name: "Mushrooms", allergens: [] },
  { id: "eggplant", name: "Eggplant", allergens: [] },
  { id: "artichoke", name: "Artichoke", allergens: [] },
  { id: "okra", name: "Okra", allergens: [] },
  { id: "turnips", name: "Turnips", allergens: [] },
  { id: "parsnips", name: "Parsnips", allergens: [] },
  { id: "mixed-vegetables", name: "Mixed vegetables", allergens: [] },
];

const PROTEIN: FoodCatalogItem[] = [
  { id: "chicken", name: "Chicken", allergens: [] },
  { id: "turkey", name: "Turkey", allergens: [] },
  { id: "lean-ground-beef", name: "Lean ground beef", allergens: [] },
  { id: "beef", name: "Beef", allergens: [] },
  { id: "pork", name: "Pork", allergens: [] },
  { id: "salmon", name: "Salmon", allergens: ["fish"] },
  { id: "tuna", name: "Tuna", allergens: ["fish"] },
  { id: "white-fish", name: "White fish", allergens: ["fish"] },
  { id: "sardines", name: "Sardines", allergens: ["fish"] },
  { id: "shrimp", name: "Shrimp", allergens: ["shellfish"] },
  { id: "whole-eggs", name: "Whole eggs", allergens: ["egg"] },
  { id: "egg-whites", name: "Egg whites", allergens: ["egg"] },
  { id: "greek-yogurt", name: "Greek yogurt", allergens: ["milk"] },
  { id: "regular-yogurt", name: "Regular yogurt", allergens: ["milk"] },
  { id: "cottage-cheese", name: "Cottage cheese", allergens: ["milk"] },
  { id: "ricotta-cheese", name: "Ricotta cheese", allergens: ["milk"] },
  { id: "cheddar-cheese", name: "Cheddar or other cheese", allergens: ["milk"] },
  { id: "tofu", name: "Tofu", allergens: ["soy"] },
  { id: "tempeh", name: "Tempeh", allergens: ["soy"] },
  { id: "edamame", name: "Edamame", allergens: ["soy"] },
  { id: "lentils", name: "Lentils", allergens: [] },
  { id: "chickpeas", name: "Chickpeas/garbanzo beans", allergens: [] },
  { id: "black-beans", name: "Black beans", allergens: [] },
  { id: "kidney-beans", name: "Kidney beans", allergens: [] },
  { id: "pinto-beans", name: "Pinto beans", allergens: [] },
  { id: "navy-beans", name: "Navy beans", allergens: [] },
  { id: "cannellini-beans", name: "Cannellini/white beans", allergens: [] },
  { id: "split-peas", name: "Split peas", allergens: [] },
  { id: "black-eyed-peas", name: "Black-eyed peas", allergens: [] },
  { id: "hummus", name: "Hummus", allergens: ["sesame"] },
];

const STARCHY_VEGETABLES = "Starchy vegetables";

const GRAINS: FoodCatalogItem[] = [
  { id: "old-fashioned-oats", name: "Old fashioned oats", allergens: ["gluten"] },
  { id: "brown-rice", name: "Brown rice", allergens: [] },
  { id: "white-rice", name: "White rice", allergens: [] },
  { id: "quinoa", name: "Quinoa", allergens: [] },
  { id: "barley", name: "Barley", allergens: ["gluten"] },
  { id: "farro", name: "Farro", allergens: ["wheat", "gluten"] },
  { id: "bulgur", name: "Bulgur", allergens: ["wheat", "gluten"] },
  { id: "couscous", name: "Couscous", allergens: ["wheat", "gluten"] },
  { id: "whole-wheat-pasta", name: "Whole-wheat pasta", allergens: ["wheat", "gluten"] },
  { id: "regular-pasta", name: "Regular pasta", allergens: ["wheat", "gluten"] },
  { id: "whole-grain-bread", name: "Whole-grain bread", allergens: ["wheat", "gluten"] },
  { id: "white-bread", name: "White bread", allergens: ["wheat", "gluten"] },
  { id: "whole-grain-cereal", name: "Whole-grain cereal", allergens: ["wheat", "gluten"] },
  { id: "cream-of-wheat", name: "Cream of wheat", allergens: ["wheat", "gluten"] },
  { id: "cream-of-rice", name: "Cream of rice", allergens: [] },
  { id: "cornmeal-polenta", name: "Cornmeal/polenta", allergens: [] },
  { id: "millet", name: "Millet", allergens: [] },
  { id: "buckwheat", name: "Buckwheat", allergens: [] },
  { id: "amaranth", name: "Amaranth", allergens: [] },
  { id: "gluten-free-oats", name: "Gluten-free oats", allergens: [] },
  { id: "gluten-free-bread-pasta", name: "Gluten-free bread or pasta", allergens: [] },
  { id: "corn", name: "Corn", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "white-potato", name: "White potato", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "sweet-potato", name: "Sweet potato", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "yam", name: "Yam", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "plantain", name: "Plantain", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "cassava-yuca", name: "Cassava/yuca", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "winter-squash", name: "Winter squash", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "green-peas", name: "Green peas", allergens: [], subgroup: STARCHY_VEGETABLES },
  { id: "lima-beans", name: "Lima beans", allergens: [], subgroup: STARCHY_VEGETABLES },
];

const FATS: FoodCatalogItem[] = [
  { id: "olive-oil", name: "Olive oil", allergens: [] },
  { id: "vegetable-oil", name: "Vegetable oil", allergens: [] },
  { id: "canola-oil", name: "Canola oil", allergens: [] },
  { id: "avocado-oil", name: "Avocado oil", allergens: [] },
  { id: "avocado", name: "Avocado", allergens: [] },
  { id: "peanut-butter", name: "Peanut butter", allergens: ["peanuts"] },
  { id: "almond-butter", name: "Almond butter", allergens: ["tree_nuts"] },
  { id: "cashew-butter", name: "Cashew butter", allergens: ["tree_nuts"] },
  { id: "sunflower-seed-butter", name: "Sunflower seed butter", allergens: [] },
  { id: "tahini", name: "Tahini/sesame seed butter", allergens: ["sesame"] },
  { id: "walnut-butter", name: "Walnut butter", allergens: ["tree_nuts"] },
  { id: "coconut-oil", name: "Coconut oil", allergens: [] },
  { id: "ground-flaxseed", name: "Ground flaxseed", allergens: [] },
  { id: "flaxseed-oil", name: "Flaxseed oil", allergens: [] },
  { id: "chia-seeds", name: "Chia seeds", allergens: [] },
  { id: "hemp-seeds", name: "Hemp seeds/hemp hearts", allergens: [] },
  { id: "ground-walnuts", name: "Ground walnuts", allergens: ["tree_nuts"] },
  { id: "ground-almonds", name: "Ground almonds", allergens: ["tree_nuts"] },
  { id: "ground-cashews", name: "Ground cashews", allergens: ["tree_nuts"] },
  { id: "ground-pecans", name: "Ground pecans", allergens: ["tree_nuts"] },
  { id: "ground-sunflower-seeds", name: "Ground sunflower seeds", allergens: [] },
  { id: "ground-pumpkin-seeds", name: "Ground pumpkin seeds", allergens: [] },
  { id: "sesame-seeds", name: "Sesame seeds", allergens: ["sesame"] },
  { id: "walnuts", name: "Walnuts", allergens: ["tree_nuts"] },
  { id: "almonds", name: "Almonds", allergens: ["tree_nuts"] },
  { id: "cashews", name: "Cashews", allergens: ["tree_nuts"] },
  { id: "pecans", name: "Pecans", allergens: ["tree_nuts"] },
  { id: "pumpkin-seeds", name: "Pumpkin seeds", allergens: [] },
  { id: "sunflower-seeds", name: "Sunflower seeds", allergens: [] },
  { id: "peanuts", name: "Peanuts", allergens: ["peanuts"] },
];

export const FOOD_CATALOG: readonly FoodCatalogCategory[] = Object.freeze([
  {
    id: "liquid-base",
    label: "Preferred liquid base",
    helpText:
      "The liquid the blend is built on. Pick as many as you'd be happy using, or choose No preference.",
    allowsNoPreference: true,
    items: LIQUID_BASE,
  },
  {
    id: "fruits",
    label: "Fruits",
    helpText: "Fruits the patient enjoys or tolerates well.",
    items: FRUITS,
  },
  {
    id: "vegetables",
    label: "Vegetables",
    helpText: "Vegetables the patient enjoys or tolerates well.",
    items: VEGETABLES,
  },
  {
    id: "protein",
    label: "Protein-rich foods & legumes",
    helpText: "Meats, fish, dairy, eggs, soy foods, and beans.",
    items: PROTEIN,
  },
  {
    id: "grains",
    label: "Grains & starchy vegetables",
    helpText:
      "Carbohydrate sources. Potatoes, corn and peas are still vegetables — they're grouped here because the recipe uses them mainly for carbohydrate.",
    items: GRAINS,
  },
  {
    id: "fats",
    label: "Healthy fats",
    helpText:
      "Oils, nut and seed butters, and ground nuts and seeds. The recipe engine picks a tube-safe form — smooth nut butter rather than whole nuts, ground flax rather than whole — and every recipe still requires blending and a physical IDDSI flow test.",
    items: FATS,
  },
] as const);

const ITEMS_BY_ID: ReadonlyMap<string, FoodCatalogItem> = new Map(
  FOOD_CATALOG.flatMap((category) => category.items.map((item) => [item.id, item] as const))
);

const ITEMS_BY_NAME: ReadonlyMap<string, FoodCatalogItem> = new Map(
  FOOD_CATALOG.flatMap((category) =>
    category.items.map((item) => [normalizeName(item.name), item] as const)
  )
);

const ALLERGEN_BY_LABEL: ReadonlyMap<string, Allergen> = new Map(
  ALLERGEN_OPTIONS.map((option) => [normalizeName(option.label), option.id] as const)
);

export function findCatalogItem(id: string): FoodCatalogItem | undefined {
  return ITEMS_BY_ID.get(id);
}

/**
 * Resolves a display name back to its catalog item. Returns undefined for
 * free-text "Other" entries, which carry no allergen information by design.
 */
export function findCatalogItemByName(name: string): FoodCatalogItem | undefined {
  return ITEMS_BY_NAME.get(normalizeName(name));
}

/** Every catalog food containing at least one of the given allergens. */
export function foodsBlockedByAllergens(allergens: readonly Allergen[]): FoodCatalogItem[] {
  if (allergens.length === 0) return [];
  const blocked = new Set(allergens);
  return [...ITEMS_BY_ID.values()].filter((item) =>
    item.allergens.some((allergen) => blocked.has(allergen))
  );
}

/**
 * The allergens a MedicalRestrictions-shaped value implies: the nine written
 * into absoluteExclusions by their ALLERGEN_OPTIONS label, plus "gluten" when
 * glutenFree is set. Free-text exclusions that don't match a known allergen
 * label are ignored here — validateFoodRestrictions handles those by name.
 */
export function allergensFromRestrictions(restrictions: {
  absoluteExclusions: string[];
  glutenFree: boolean;
}): Allergen[] {
  const allergens = new Set<Allergen>();

  for (const exclusion of restrictions.absoluteExclusions) {
    const allergen = ALLERGEN_BY_LABEL.get(normalizeName(exclusion));
    if (allergen) allergens.add(allergen);
  }

  if (restrictions.glutenFree) allergens.add("gluten");

  return [...allergens];
}

/** The user-facing label for an allergen, for use in "excluded — milk allergy" copy. */
export function allergenLabel(allergen: Allergen): string {
  return ALLERGEN_OPTIONS.find((option) => option.id === allergen)?.label ?? allergen;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}
