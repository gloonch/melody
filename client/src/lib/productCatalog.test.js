import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_PRODUCT_FILTERS,
  parseProductFilterHash,
  productMatchesFilters,
  serializeProductFilterHash,
} from "./productCatalog.js";

const baseProduct = {
  title: "گل سینه مشکی",
  description: "گل پارچه‌ای",
  colors: ["black"],
  techniques: ["kerisheh"],
  materials: ["chiffon"],
  useCases: ["evening_dress"],
  features: ["lightweight"],
  attachmentTypes: ["pin"],
  diameterCm: 12,
};

test("parses and serializes old and new product hash filters", () => {
  const filters = parseProductFilterHash("#technique=three-dimensional&material=chiffon&use=evening-dress&feature=lightweight&attachment=pin");
  assert.deepEqual(filters.techniques, ["three_dimensional"]);
  assert.deepEqual(filters.features, ["lightweight"]);
  assert.deepEqual(filters.attachmentTypes, ["pin"]);
  assert.equal(serializeProductFilterHash(filters), "#technique=three-dimensional&material=chiffon&use=evening-dress&feature=lightweight&attachment=pin");
});

test("uses OR inside a group and AND between groups", () => {
  const filters = {
    ...EMPTY_PRODUCT_FILTERS,
    techniques: ["fashion", "kerisheh"],
    materials: ["chiffon"],
    attachmentTypes: ["pin"],
  };
  assert.equal(productMatchesFilters(baseProduct, filters), true);
  assert.equal(productMatchesFilters({ ...baseProduct, attachmentTypes: ["clip"] }, filters), false);
});

test("Persian color query matches controlled color metadata", () => {
  assert.equal(productMatchesFilters(baseProduct, { ...EMPTY_PRODUCT_FILTERS, query: "مشکی" }), true);
  assert.equal(productMatchesFilters({ ...baseProduct, title: "گل سینه سفید", colors: ["white"] }, { ...EMPTY_PRODUCT_FILTERS, query: "مشکی" }), false);
});
