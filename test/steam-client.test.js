import assert from "node:assert/strict";
import test from "node:test";
import { fetchSteamAppDetails } from "../src/steam-client.js";

test("fetches Steam app details with the expected query", async () => {
  let requestedUrl;
  const data = { name: "Example Game" };
  const result = await fetchSteamAppDetails(12345, {
    language: "vietnamese",
    country: "vn",
    signal: AbortSignal.timeout(1_000),
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({ "12345": { success: true, data } })
      };
    }
  });

  assert.equal(requestedUrl.origin, "https://store.steampowered.com");
  assert.equal(requestedUrl.searchParams.get("appids"), "12345");
  assert.equal(requestedUrl.searchParams.get("l"), "vietnamese");
  assert.equal(requestedUrl.searchParams.get("cc"), "vn");
  assert.equal(result, data);
});

test("rejects invalid App IDs before making a request", async () => {
  await assert.rejects(() => fetchSteamAppDetails("12x"), /digits only/);
});

test("reports missing public Steam records", async () => {
  await assert.rejects(
    () => fetchSteamAppDetails("12345", {
      signal: AbortSignal.timeout(1_000),
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ "12345": { success: false } })
      })
    }),
    /no public store data/
  );
});
