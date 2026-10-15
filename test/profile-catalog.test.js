import assert from "node:assert/strict";
import test from "node:test";
import { ProfileCatalog } from "../src/profile-catalog.js";

const catalog = await ProfileCatalog.load();

test("initializes one profile for every accepted input name", () => {
  assert.equal(catalog.profiles.length, 5262);
  assert.equal(new Set(catalog.profiles.map((profile) => profile.inputRecordId)).size, 5262);
});

test("does not claim unresearched profiles are identified", () => {
  const status = catalog.status();
  assert.equal(status.researched + status.pending + status.failed, 5262);
  const pending = catalog.profiles.filter((profile) => profile.research.steam.status === "pending");
  assert.ok(pending.every((profile) => profile.canonicalId === null));
  assert.ok(pending.every((profile) => profile.status === "needs_verification"));
  assert.ok(pending.every((profile) => profile.confidence === "low"));
});

test("finds exact supplied names before fuzzy matches", () => {
  const result = catalog.search("The Witcher 3: Wild Hunt", { limit: 10 });
  assert.ok(result.total >= 3);
  assert.equal(result.items[0].suppliedName, "The Witcher 3: Wild Hunt");
  assert.equal(result.items[0].matchScore, 100);
});

test("marks equally strong matches as ambiguous", () => {
  const profiles = [
    makeProfile("input-000000000001", "Same Name"),
    makeProfile("input-000000000002", "Same Name")
  ];
  const result = new ProfileCatalog(profiles).search("same name");
  assert.equal(result.ambiguous, true);
  assert.equal(result.items.length, 2);
});

function makeProfile(inputRecordId, suppliedName) {
  return {
    inputRecordId,
    suppliedName,
    officialName: null,
    aliases: [],
    confidence: "low",
    status: "needs_verification",
    research: { steam: { status: "pending" } }
  };
}
