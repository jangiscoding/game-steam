import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeText } from "../src/catalog.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run import -- /path/to/games.txt");
  process.exit(1);
}

const source = await readFile(resolve(inputPath), "utf8");
const jsonText = source.replace(/^\s*Game\s*/u, "");
const records = JSON.parse(jsonText);

if (!Array.isArray(records)) {
  throw new TypeError("Input must contain a JSON array");
}

const games = [];
const rejected = [];

for (const [index, record] of records.entries()) {
  const reason = validate(record);
  if (reason) {
    rejected.push({ sourceIndex: index, reason, record });
    continue;
  }

  const name = record.name.trim();
  const appId = record.imageUrl.match(/\/apps\/(\d+)\//)?.[1] ?? null;
  games.push({
    name,
    appId,
    imageUrl: record.imageUrl,
    isFeatured: record.isFeatured,
    initial: classifyInitial(name)
  });
}

games.sort((left, right) => left.name.localeCompare(right.name, "en", {
  numeric: true,
  sensitivity: "base"
}));

const duplicateAppIds = findDuplicateAppIds(games);
const report = {
  sourceRecords: records.length,
  acceptedRecords: games.length,
  rejectedRecords: rejected.length,
  recordsWithoutAppId: games.filter((game) => !game.appId).length,
  duplicateAppIdGroups: duplicateAppIds.length,
  duplicateAppIds,
  rejected
};

const dataDirectory = resolve(projectRoot, "data");
await mkdir(dataDirectory, { recursive: true });
await writeFile(resolve(dataDirectory, "games.json"), `${JSON.stringify(games, null, 2)}\n`);
await writeFile(resolve(dataDirectory, "import-report.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Imported ${games.length}/${records.length} games; rejected ${rejected.length}.`);
console.log(`Found ${duplicateAppIds.length} duplicate App ID groups.`);

function validate(record) {
  if (!record || typeof record !== "object") return "Record is not an object";
  if (typeof record.name !== "string" || !record.name.trim()) return "Invalid name";
  if (typeof record.imageUrl !== "string") return "Invalid image URL";
  try {
    const url = new URL(record.imageUrl);
    if (url.protocol !== "https:") return "Image URL must use HTTPS";
  } catch {
    return "Invalid image URL";
  }
  if (typeof record.isFeatured !== "boolean") return "Invalid isFeatured flag";
  return null;
}

function classifyInitial(name) {
  const initial = normalizeText(name).slice(0, 1).toUpperCase();
  return /^[A-Z]$/.test(initial) ? initial : "#";
}

function findDuplicateAppIds(items) {
  const grouped = new Map();
  for (const game of items) {
    if (!game.appId) continue;
    const namesForId = grouped.get(game.appId) ?? [];
    namesForId.push(game.name);
    grouped.set(game.appId, namesForId);
  }
  return [...grouped]
    .filter(([, itemNames]) => itemNames.length > 1)
    .map(([appId, itemNames]) => ({ appId, names: itemNames }));
}
