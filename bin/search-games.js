#!/usr/bin/env node
import { GameCatalog } from "../src/catalog.js";

const options = parseArguments(process.argv.slice(2));
const catalog = await GameCatalog.load();
console.log(JSON.stringify(catalog.search(options), null, 2));

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) continue;
    const [key, inlineValue] = argument.slice(2).split("=", 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) index += 1;
    const mappedKey = key === "q" ? "query" : key;
    options[mappedKey] = value;
  }
  return options;
}
