import { readFile, writeFile } from "node:fs/promises";
import { normalizeText } from "../src/catalog.js";

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

for (const [appId, relatedProfiles] of groups) {
  try {
    const storeData = await fetchSteamApp(appId);
    for (const profile of relatedProfiles) applySteamData(profile, storeData, appId);
    completed += relatedProfiles.length;
    console.log(`Verified Steam app ${appId}: ${storeData.name}`);
  } catch (error) {
    for (const profile of relatedProfiles) {
      profile.research.steam = {
        status: "failed",
        checkedAt: new Date().toISOString(),
        error: error.message
      };
    }
    failed += relatedProfiles.length;
    console.error(`Failed Steam app ${appId}: ${error.message}`);
  }

  if (options.delayMs) await delay(options.delayMs);
}

await writeFile(profilesUrl, `${JSON.stringify(profiles, null, 2)}\n`);
await writeFile(manifestUrl, `${JSON.stringify(buildManifest(profiles), null, 2)}\n`);
console.log(`Updated ${completed} profiles; ${failed} failed.`);

async function fetchSteamApp(appId) {
  const endpoint = new URL("https://store.steampowered.com/api/appdetails");
  endpoint.searchParams.set("appids", appId);
  endpoint.searchParams.set("l", "english");
  endpoint.searchParams.set("cc", "us");

  const response = await fetch(endpoint, {
    headers: { "user-agent": "game-steam-library-research/1.0" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const payload = await response.json();
  if (!payload[appId]?.success || !payload[appId].data) {
    throw new Error("Steam returned no public store data");
  }
  return payload[appId].data;
}

function applySteamData(profile, data, appId) {
  const exactNameMatch = normalizeText(profile.suppliedName) === normalizeText(data.name);
  const storeUrl = `https://store.steampowered.com/app/${appId}/`;
  const source = {
    label: "Steam Store",
    url: storeUrl,
    accessedAt: new Date().toISOString(),
    supports: [
      "officialName",
      "productType",
      "identifiedVersionReleaseYear",
      "developers",
      "publishers",
      "platforms",
      "genres",
      "shortDescription"
    ]
  };

  profile.officialName = data.name;
  profile.canonicalId = exactNameMatch ? `steam-app-${appId}` : null;
  profile.productType = classifyProductType(data.type, data.name);
  profile.editionName = extractEditionName(data.name);
  profile.identifiedVersionReleaseYear = extractYear(data.release_date?.date);
  profile.developers = uniqueStrings(data.developers);
  profile.publishers = uniqueStrings(data.publishers);
  profile.platforms = Object.entries(data.platforms ?? {})
    .filter(([, supported]) => supported)
    .map(([platform]) => platform);
  profile.genres = uniqueStrings((data.genres ?? []).map((genre) => genre.description));
  profile.shortDescription = stripHtml(data.short_description) || null;
  profile.sources = [
    ...profile.sources.filter((item) => item.url !== storeUrl),
    source
  ];
  profile.confidence = exactNameMatch ? "high" : "medium";
  profile.status = exactNameMatch ? "identified" : "needs_verification";
  profile.verificationNotes = exactNameMatch
    ? ["The supplied name exactly matches the normalized official Steam name for the supplied App ID."]
    : [
        `The supplied name does not exactly match Steam's official name “${data.name}” for App ID ${appId}.`,
        "Confirm the edition or alias using another authoritative source before linking a canonical ID."
      ];
  profile.research.steam = {
    status: "success",
    checkedAt: new Date().toISOString(),
    error: null
  };
}

function classifyProductType(storeType, name) {
  if (storeType === "dlc") return "dlc";
  if (storeType && storeType !== "game") return storeType;
  if (/\bremaster(?:ed)?\b/i.test(name)) return "remaster";
  if (/\bremake\b/i.test(name)) return "remake";
  if (/\b(?:deluxe|complete|definitive|ultimate|collector'?s?|gold|premium|game of the year|goty) edition\b/i.test(name)) {
    return "edition";
  }
  return "game";
}

function extractEditionName(name) {
  const match = name.match(/\b((?:deluxe|complete|definitive|ultimate|collector'?s?|gold|premium|game of the year|goty) edition)\b/i);
  return match?.[1] ?? null;
}

function extractYear(value) {
  const match = String(value ?? "").match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function groupPendingProfiles(items, force) {
  const grouped = new Map();
  for (const profile of items) {
    if (!force && profile.research.steam.status === "success") continue;
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
  return {
    schemaVersion: 1,
    inputRecords: items.length,
    researchedRecords: researched,
    pendingRecords: items.length - researched - failed,
    failedRecords: failed,
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
