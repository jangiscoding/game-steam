import { normalizeText } from "./catalog.js";

const STORAGE_UNIT_BYTES = {
  MB: 1_000_000,
  GB: 1_000_000_000,
  TB: 1_000_000_000_000
};

export function extractSteamMetadata(data, appId) {
  const categories = (data.categories ?? []).map((category) => ({
    id: category.id,
    description: category.description
  }));

  return {
    appId: String(appId),
    links: {
      store: `https://store.steampowered.com/app/${appId}/`,
      officialWebsite: validHttpUrl(data.website),
      support: validHttpUrl(data.support_info?.url)
    },
    storageRequirements: {
      kind: "required_free_space",
      windows: extractPlatformStorage(data.pc_requirements),
      macos: extractPlatformStorage(data.mac_requirements),
      linux: extractPlatformStorage(data.linux_requirements),
      note: "Steam publishes required free space, not the exact installed or download size."
    },
    controllerSupport: extractControllerSupport(data, categories),
    playerModes: extractPlayerModes(categories),
    genres: uniqueStrings((data.genres ?? []).map((genre) => genre.description)),
    categories
  };
}

export function applySteamData(profile, data, appId, checkedAt = new Date().toISOString()) {
  const exactNameMatch = normalizeText(profile.suppliedName) === normalizeText(data.name);
  const steamMetadata = extractSteamMetadata(data, appId);
  const storeUrl = steamMetadata.links.store;
  const source = {
    label: "Steam Store",
    url: storeUrl,
    accessedAt: checkedAt,
    supports: [
      "officialName",
      "productType",
      "identifiedVersionReleaseYear",
      "developers",
      "publishers",
      "platforms",
      "genres",
      "shortDescription",
      "steamMetadata.links",
      "steamMetadata.storageRequirements",
      "steamMetadata.controllerSupport",
      "steamMetadata.playerModes"
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
  profile.genres = steamMetadata.genres;
  profile.shortDescription = stripHtml(data.short_description) || null;
  profile.steamMetadata = steamMetadata;
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
    checkedAt,
    error: null
  };

  return profile;
}

export function extractPlatformStorage(requirements) {
  if (!requirements || Array.isArray(requirements)) {
    return { minimum: null, recommended: null };
  }
  return {
    minimum: parseStorageRequirement(requirements.minimum),
    recommended: parseStorageRequirement(requirements.recommended)
  };
}

export function parseStorageRequirement(html) {
  const text = stripHtml(html);
  if (!text) return null;

  const match = text.match(
    /(?:storage|hard drive|hard disk(?: space)?)[^0-9]{0,80}(\d+(?:[.,]\d+)?)\s*(MB|GB|TB)\b/i
  );
  if (!match) return null;

  const value = Number.parseFloat(match[1].replace(",", "."));
  const unit = match[2].toUpperCase();
  return {
    value,
    unit,
    display: `${value} ${unit}`,
    approximateBytes: Math.round(value * STORAGE_UNIT_BYTES[unit]),
    evidenceText: match[0].trim()
  };
}

function extractControllerSupport(data, categories) {
  const categoryNames = categories.map((category) => category.description);
  let level = data.controller_support ?? null;
  if (!level && categoryNames.some((name) => /full controller support/i.test(name))) level = "full";
  if (!level && categoryNames.some((name) => /partial controller support/i.test(name))) level = "partial";

  const xboxEvidence = categoryNames.find((name) => /xbox.*controller|controller.*xbox/i.test(name));
  return {
    level: level === "full" || level === "partial" ? level : "unknown",
    xboxCompatible: xboxEvidence ? true : null,
    xboxEvidence: xboxEvidence ?? null,
    note: xboxEvidence
      ? null
      : "Generic Steam controller support does not prove Xbox controller compatibility."
  };
}

function extractPlayerModes(categories) {
  const labels = categories.map((category) => category.description);
  const has = (pattern) => labels.some((label) => pattern.test(label));
  return {
    singlePlayer: has(/single.player/i),
    multiplayer: has(/multi.player|online pvp|lan pvp|massively multiplayer/i),
    coop: has(/co.op/i),
    onlineCoop: has(/online co.op/i),
    localCoop: has(/local co.op|shared.split screen co.op/i),
    lanCoop: has(/lan co.op/i),
    sharedOrSplitScreen: has(/shared.split screen/i),
    pvp: has(/pvp/i),
    maximumPlayers: null,
    maximumPlayersNote: "The public Steam app-details response does not provide a reliable exact player limit.",
    evidence: labels.filter((label) =>
      /single.player|multi.player|co.op|pvp|shared.split screen|massively multiplayer/i.test(label)
    )
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

export function stripHtml(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}
