import { readFile } from "node:fs/promises";
import { normalizeText } from "./catalog.js";

const DEFAULT_PROFILES_URL = new URL("../data/game-profiles.json", import.meta.url);

export class ProfileCatalog {
  constructor(profiles) {
    this.profiles = profiles.map((profile) => ({
      ...profile,
      _searchNames: buildSearchNames(profile)
    }));
    this.byId = new Map(this.profiles.map((profile) => [profile.inputRecordId, profile]));
  }

  static async load(profilesUrl = DEFAULT_PROFILES_URL) {
    const profiles = JSON.parse(await readFile(profilesUrl, "utf8"));
    return new ProfileCatalog(profiles);
  }

  getById(id) {
    return stripInternalFields(this.byId.get(id));
  }

  search(query, options = {}) {
    const normalizedQuery = normalizeText(query);
    const limit = clampInteger(options.limit, 20, 1, 100);
    if (!normalizedQuery) return { query: normalizedQuery, ambiguous: false, items: [] };

    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const matches = [];

    for (const profile of this.profiles) {
      const scores = profile._searchNames.map((name) => scoreName(name, normalizedQuery, tokens));
      const score = Math.max(...scores);
      if (score > 0) matches.push({ score, profile });
    }

    matches.sort((left, right) =>
      right.score - left.score ||
      left.profile.suppliedName.localeCompare(right.profile.suppliedName, "en", {
        sensitivity: "base",
        numeric: true
      })
    );

    const items = matches.slice(0, limit).map(({ score, profile }) => ({
      matchScore: score,
      ...stripInternalFields(profile)
    }));
    const topScore = items[0]?.matchScore;

    return {
      query: normalizedQuery,
      total: matches.length,
      ambiguous: items.filter((item) => item.matchScore === topScore).length > 1,
      items
    };
  }

  status() {
    const statuses = {};
    const confidence = {};
    let researched = 0;
    let failed = 0;

    for (const profile of this.profiles) {
      statuses[profile.status] = (statuses[profile.status] ?? 0) + 1;
      confidence[profile.confidence] = (confidence[profile.confidence] ?? 0) + 1;
      if (profile.research.steam.status === "success") researched += 1;
      if (profile.research.steam.status === "failed") failed += 1;
    }

    return {
      total: this.profiles.length,
      researched,
      pending: this.profiles.length - researched - failed,
      failed,
      statuses,
      confidence
    };
  }
}

function buildSearchNames(profile) {
  return [profile.suppliedName, profile.officialName, ...profile.aliases]
    .map(normalizeText)
    .filter(Boolean);
}

function scoreName(name, query, tokens) {
  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  if (name.includes(query)) return 60;
  if (tokens.every((token) => name.includes(token))) return 40;
  return 0;
}

function stripInternalFields(profile) {
  if (!profile) return null;
  const { _searchNames, ...result } = profile;
  return result;
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}
