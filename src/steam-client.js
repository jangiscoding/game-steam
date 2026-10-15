const STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails";

export async function fetchSteamAppDetails(appId, options = {}) {
  const normalizedAppId = String(appId ?? "").trim();
  if (!/^\d+$/.test(normalizedAppId)) {
    throw new TypeError("Steam App ID must contain digits only");
  }

  const {
    language = "english",
    country = "us",
    timeoutMs = 20_000,
    fetchImpl = globalThis.fetch,
    signal = AbortSignal.timeout(timeoutMs)
  } = options;

  if (typeof fetchImpl !== "function") {
    throw new TypeError("A Fetch-compatible implementation is required");
  }

  const endpoint = new URL(STEAM_APP_DETAILS_URL);
  endpoint.searchParams.set("appids", normalizedAppId);
  endpoint.searchParams.set("l", language);
  endpoint.searchParams.set("cc", country);

  const response = await fetchImpl(endpoint, {
    headers: { "user-agent": "game-steam-library-research/1.0" },
    signal
  });
  if (!response.ok) {
    const error = new Error(`Steam Store request failed with HTTP ${response.status}`);
    error.status = response.status;
    error.retryAfterSeconds = parseRetryAfter(response.headers?.get?.("retry-after"));
    throw error;
  }

  const payload = await response.json();
  if (!payload[normalizedAppId]?.success || !payload[normalizedAppId].data) {
    const error = new Error(`Steam returned no public store data for App ID ${normalizedAppId}`);
    error.code = "NO_PUBLIC_DATA";
    throw error;
  }

  return payload[normalizedAppId].data;
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds)) return seconds;
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}
