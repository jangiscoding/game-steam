import assert from "node:assert/strict";
import test from "node:test";
import { GameCatalog, normalizeText } from "../src/catalog.js";

const catalog = await GameCatalog.load();

test("loads the normalized catalog", () => {
  assert.equal(catalog.games.length, 5262);
  assert.equal(catalog.facets().featured, 50);
});

test("normalizes accents and punctuation for search", () => {
  assert.equal(normalizeText("Pokémon™: Café"), "pokemon cafe");
  const result = catalog.search({ query: "witcher wild hunt", limit: 10 });
  assert.ok(result.total >= 3);
  assert.ok(result.items.every((game) => game.name.includes("Witcher 3")));
});

test("filters featured games and paginates", () => {
  const result = catalog.search({ featured: true, limit: 7, offset: 7 });
  assert.equal(result.total, 50);
  assert.equal(result.items.length, 7);
  assert.ok(result.items.every((game) => game.isFeatured));
});

test("keeps aliases that share a Steam App ID", () => {
  const matches = catalog.getByAppId("292030");
  assert.equal(matches.length, 3);
  assert.ok(matches.some((game) => game.name === "The Witcher 3: Wild Hunt"));
});

test("filters by initial and applies a maximum page size", () => {
  const result = catalog.search({ initial: "z", limit: 500 });
  assert.equal(result.limit, 100);
  assert.ok(result.items.every((game) => game.initial === "Z"));
});
