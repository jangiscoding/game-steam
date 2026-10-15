import { readFile, writeFile } from "node:fs/promises";
import { fetchSteamAppDetails } from "../src/steam-client.js";
import { applySteamData } from "../src/steam-metadata.js";

const profilesUrl = new URL("../data/game-profiles.json", import.meta.url);
const manifestUrl = new URL("../data/research-manifest.json", import.meta.url);
const options = parseArguments(process.argv.slice(2));
const profiles = JSON.parse(await readFile(profilesUrl, "utf8"));
const groups = groupPendingProfiles(profiles, options.force).slice(options.start, options.start + options.limit);

if (!groups.length) {
  console.log("No matching pending Steam profiles.");
  process.exit(0);
}

let completed = 0;
let failed = 0;

for (let offset = 0; offset < groups.length; offset += options.checkpointEvery) {
  const checkpoint = groups.slice(offset, offset + options.checkpointEvery);
  await processGroups(checkpoint, options.concurrency);
  await persistProgress();
  console.log(
    `Checkpoint ${Math.min(offset + checkpoint.length, groups.length)}/${groups.length}: ` +
    `${completed} updated, ${failed} failed.`
  );
}

console.log(`Updated ${completed} profiles; ${failed} failed.`);

async function processGroups(selectedGroups, concurrency) {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, selectedGroups.length);

  async function worker() {
    while (nextIndex < selectedGroups.length) {
      const groupIndex = nextIndex;
      nextIndex += 1;
      await processGroup(selectedGroups[groupIndex]);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function processGroup([appId, relatedProfiles]) {
  try {
    const storeData = await fetchWithRetry(appId);
    for (const profile of relatedProfiles) applySteamData(profile, storeData, appId);
    completed += relatedProfiles.length;
    if (options.verbose) console.log(`Verified Steam app ${appId}: ${storeData.name}`);
  } catch (error) {
    const researchStatus = error.code === "NO_PUBLIC_DATA"
      ? "not_found"
      : error.status === 429
        ? "retry_pending"
        : "failed";
    for (const profile of relatedProfiles) {
      profile.research.steam = {
        status: researchStatus,
        checkedAt: new Date().toISOString(),
        error: error.message
      };
    }
    failed += relatedProfiles.length;
    console.error(`Failed Steam app ${appId}: ${error.message}`);
  }

  if (options.delayMs) await delay(options.delayMs);
}

async function fetchWithRetry(appId) {
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await fetchSteamAppDetails(appId);
    } catch (error) {
      if (error.status !== 429 || attempt === options.retries) throw error;
      const serverDelay = (error.retryAfterSeconds ?? 0) * 1_000;
      const backoff = Math.min(
        options.retryBaseMs * (2 ** attempt),
        options.maxBackoffMs
      );
      const waitMs = Math.max(serverDelay, backoff);
      console.warn(`Steam rate limit for ${appId}; retrying in ${waitMs} ms.`);
      await delay(waitMs);
    }
  }
  throw new Error("Unexpected retry state");
}

async function persistProgress() {
  await writeFile(profilesUrl, `${JSON.stringify(profiles, null, 2)}\n`);
  await writeFile(manifestUrl, `${JSON.stringify(buildManifest(profiles), null, 2)}\n`);
}

function groupPendingProfiles(items, force) {
  const grouped = new Map();
  for (const profile of items) {
    if (!force && ["success", "not_found"].includes(profile.research.steam.status)) continue;
    const appId = profile.candidateIdentifiers.steamAppId;
    if (!appId) continue;
    const group = grouped.get(appId) ?? [];
    group.push(profile);
    grouped.set(appId, group);
  }
  return [...grouped];
}

function buildManifest(items) {
  const researched = items.filter((profile) => profile.research.steam.status === "success").length;
  const failed = items.filter((profile) => profile.research.steam.status === "failed").length;
  const notFound = items.filter((profile) => profile.research.steam.status === "not_found").length;
  return {
    schemaVersion: 1,
    inputRecords: items.length,
    researchedRecords: researched,
    pendingRecords: items.length - researched - failed - notFound,
    failedRecords: failed,
    notFoundRecords: notFound,
    orphanedProfileIds: []
  };
}

function parseArguments(args) {
  const values = Object.fromEntries(args.map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=", 2);
    return [key, value];
  }));
  return {
    start: parseNonNegativeInteger(values.start, 0),
    limit: parsePositiveInteger(values.limit, 25),
    delayMs: parseNonNegativeInteger(values["delay-ms"], 250),
    concurrency: parsePositiveInteger(values.concurrency, 1),
    checkpointEvery: parsePositiveInteger(values["checkpoint-every"], 50),
    retries: parseNonNegativeInteger(values.retries, 4),
    retryBaseMs: parsePositiveInteger(values["retry-base-ms"], 5_000),
    maxBackoffMs: parsePositiveInteger(values["max-backoff-ms"], 300_000),
    verbose: values.verbose === "true",
    force: values.force === "true"
  };
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
