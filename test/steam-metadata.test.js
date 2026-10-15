import assert from "node:assert/strict";
import test from "node:test";
import {
  applySteamData,
  extractSteamMetadata,
  parseStorageRequirement
} from "../src/steam-metadata.js";

const fixture = {
  type: "game",
  name: "Example Game",
  website: "https://example.test/game",
  support_info: { url: "https://example.test/support" },
  short_description: "Play <strong>together</strong>.",
  controller_support: "full",
  pc_requirements: {
    minimum: "<strong>Storage:</strong> 12 GB available space",
    recommended: "<strong>Hard Drive:</strong> 20.5 GB available space"
  },
  mac_requirements: {
    minimum: "Storage: 800 MB available space"
  },
  linux_requirements: [],
  platforms: { windows: true, mac: true, linux: false },
  genres: [
    { id: "1", description: "Action" },
    { id: "23", description: "Indie" }
  ],
  categories: [
    { id: 2, description: "Single-player" },
    { id: 1, description: "Multi-player" },
    { id: 38, description: "Online Co-op" },
    { id: 24, description: "Shared/Split Screen" },
    { id: 28, description: "Full controller support" }
  ],
  developers: ["Example Studio"],
  publishers: ["Example Publisher"],
  release_date: { date: "15 Oct, 2024" }
};

test("extracts links, storage, genres, controller level, and player modes", () => {
  const metadata = extractSteamMetadata(fixture, "12345");

  assert.equal(metadata.links.store, "https://store.steampowered.com/app/12345/");
  assert.equal(metadata.links.officialWebsite, "https://example.test/game");
  assert.equal(metadata.storageRequirements.windows.minimum.display, "12 GB");
  assert.equal(metadata.storageRequirements.windows.minimum.approximateBytes, 12_000_000_000);
  assert.equal(metadata.storageRequirements.windows.recommended.display, "20.5 GB");
  assert.equal(metadata.storageRequirements.macos.minimum.display, "800 MB");
  assert.equal(metadata.storageRequirements.linux.minimum, null);
  assert.deepEqual(metadata.genres, ["Action", "Indie"]);
  assert.equal(metadata.controllerSupport.level, "full");
  assert.equal(metadata.controllerSupport.xboxCompatible, null);
  assert.equal(metadata.playerModes.singlePlayer, true);
  assert.equal(metadata.playerModes.multiplayer, true);
  assert.equal(metadata.playerModes.onlineCoop, true);
  assert.equal(metadata.playerModes.sharedOrSplitScreen, true);
  assert.equal(metadata.playerModes.maximumPlayers, null);
});

test("parses common Steam storage requirement labels", () => {
  assert.equal(parseStorageRequirement("Hard Disk Space: 1,5 GB").display, "1.5 GB");
  assert.equal(parseStorageRequirement("No published disk requirement"), null);
});

test("applies verified metadata and source coverage to a profile", () => {
  const profile = {
    suppliedName: "Example Game",
    sources: [],
    research: { steam: { status: "pending" } }
  };

  applySteamData(profile, fixture, "12345", "2026-10-15T00:00:00.000Z");

  assert.equal(profile.canonicalId, "steam-app-12345");
  assert.equal(profile.status, "identified");
  assert.equal(profile.identifiedVersionReleaseYear, 2024);
  assert.equal(profile.steamMetadata.playerModes.maximumPlayers, null);
  assert.ok(profile.sources[0].supports.includes("steamMetadata.storageRequirements"));
  assert.equal(profile.research.steam.checkedAt, "2026-10-15T00:00:00.000Z");
});
