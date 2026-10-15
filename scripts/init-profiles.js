import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const gamesUrl = new URL("../data/games.json", import.meta.url);
const profilesUrl = new URL("../data/game-profiles.json", import.meta.url);
const manifestUrl = new URL("../data/research-manifest.json", import.meta.url);

const games = JSON.parse(await readFile(gamesUrl, "utf8"));
const existingProfiles = await readJsonIfPresent(profilesUrl, []);
const existingById = new Map(existingProfiles.map((profile) => [profile.inputRecordId, profile]));

const profiles = games.map((game) => {
  const inputRecordId = createInputRecordId(game);
  const existing = existingById.get(inputRecordId);
  if (existing) {
    return {
      ...existing,
      suppliedName: game.name,
      suppliedImageUrl: game.imageUrl,
      candidateIdentifiers: { steamAppId: game.appId }
    };
  }

  return {
    inputRecordId,
    canonicalId: null,
    suppliedName: game.name,
    suppliedImageUrl: game.imageUrl,
    officialName: null,
    aliases: [],
    series: null,
    franchise: null,
    productType: "unknown",
    editionName: null,
    originalReleaseYear: null,
    identifiedVersionReleaseYear: null,
    developers: [],
    publishers: [],
    platforms: [],
    genres: [],
    shortDescription: null,
    confusingWith: [],
    candidateIdentifiers: { steamAppId: game.appId },
    sources: [],
    confidence: "low",
    status: "needs_verification",
    verificationNotes: [
      "Steam App ID was extracted from the supplied image URL but has not been verified against an official source."
    ],
    research: {
      steam: {
        status: "pending",
        checkedAt: null,
        error: null
      }
    }
  };
});

const knownIds = new Set(profiles.map((profile) => profile.inputRecordId));
const orphanedProfiles = existingProfiles
  .filter((profile) => !knownIds.has(profile.inputRecordId))
  .map((profile) => profile.inputRecordId);

await writeFile(profilesUrl, `${JSON.stringify(profiles, null, 2)}\n`);
await writeFile(manifestUrl, `${JSON.stringify(buildManifest(profiles, orphanedProfiles), null, 2)}\n`);

console.log(`Initialized ${profiles.length} profiles; preserved ${profiles.filter((p) => existingById.has(p.inputRecordId)).length}.`);
if (orphanedProfiles.length) console.warn(`Found ${orphanedProfiles.length} orphaned existing profiles.`);

function createInputRecordId(game) {
  const hash = createHash("sha256")
    .update(`${game.appId}\0${game.name}`)
    .digest("hex")
    .slice(0, 12);
  return `input-${hash}`;
}

function buildManifest(items, orphaned) {
  const researched = items.filter((profile) => profile.research.steam.status === "success").length;
  const failed = items.filter((profile) => profile.research.steam.status === "failed").length;
  return {
    schemaVersion: 1,
    inputRecords: items.length,
    researchedRecords: researched,
    pendingRecords: items.length - researched - failed,
    failedRecords: failed,
    orphanedProfileIds: orphaned
  };
}

async function readJsonIfPresent(url, fallback) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}
