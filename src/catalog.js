import { readFile } from "node:fs/promises";

const DEFAULT_DATA_URL = new URL("../data/games.json", import.meta.url);

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compareNames(left, right) {
  return left.name.localeCompare(right.name, "en", {
    numeric: true,
    sensitivity: "base"
  });
}

export class GameCatalog {
  constructor(games) {
    this.games = games.map((game) => ({
      ...game,
      _searchName: normalizeText(game.name)
    }));
    this.byAppId = new Map();

    for (const game of this.games) {
      if (!game.appId) continue;
      const matches = this.byAppId.get(game.appId) ?? [];
      matches.push(game);
      this.byAppId.set(game.appId, matches);
    }
  }

  static async load(dataUrl = DEFAULT_DATA_URL) {
    const games = JSON.parse(await readFile(dataUrl, "utf8"));
    return new GameCatalog(games);
  }

  getByAppId(appId) {
    return (this.byAppId.get(String(appId)) ?? []).map(stripInternalFields);
  }

  search(options = {}) {
    const query = normalizeText(options.query);
    const tokens = query.split(" ").filter(Boolean);
    const featured = parseOptionalBoolean(options.featured);
    const initial = normalizeText(options.initial).slice(0, 1);
    const limit = clampInteger(options.limit, 20, 1, 100);
    const offset = clampInteger(options.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const sort = options.sort === "name-desc" ? "name-desc" : "name-asc";

    let matches = this.games.filter((game) => {
      if (tokens.length && !tokens.every((token) => game._searchName.includes(token))) {
        return false;
      }
      if (featured !== undefined && game.isFeatured !== featured) return false;
      if (initial && game.initial !== initial.toUpperCase()) return false;
      return true;
    });

    matches = matches.sort(compareNames);
    if (sort === "name-desc") matches.reverse();

    return {
      total: matches.length,
      offset,
      limit,
      items: matches.slice(offset, offset + limit).map(stripInternalFields)
    };
  }

  facets() {
    const initials = {};
    let featured = 0;
    for (const game of this.games) {
      initials[game.initial] = (initials[game.initial] ?? 0) + 1;
      if (game.isFeatured) featured += 1;
    }
    return {
      total: this.games.length,
      featured,
      standard: this.games.length - featured,
      initials
    };
  }
}

function stripInternalFields({ _searchName, ...game }) {
  return game;
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return undefined;
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}
