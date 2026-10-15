import { createServer } from "node:http";
import { GameCatalog } from "./catalog.js";
import { ProfileCatalog } from "./profile-catalog.js";

const catalog = await GameCatalog.load();
const profiles = await ProfileCatalog.load();
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  if (url.pathname === "/health") {
    return sendJson(response, 200, { status: "ok", games: catalog.games.length });
  }

  if (url.pathname === "/games") {
    return sendJson(response, 200, catalog.search({
      query: url.searchParams.get("q"),
      featured: url.searchParams.get("featured"),
      initial: url.searchParams.get("initial"),
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      sort: url.searchParams.get("sort")
    }));
  }

  if (url.pathname === "/facets") {
    return sendJson(response, 200, catalog.facets());
  }

  if (url.pathname === "/profiles") {
    return sendJson(response, 200, profiles.search(url.searchParams.get("q"), {
      limit: url.searchParams.get("limit")
    }));
  }

  if (url.pathname === "/research/status") {
    return sendJson(response, 200, profiles.status());
  }

  const profileMatch = url.pathname.match(/^\/profiles\/(input-[a-f0-9]{12})$/);
  if (profileMatch) {
    const profile = profiles.getById(profileMatch[1]);
    return profile
      ? sendJson(response, 200, profile)
      : sendJson(response, 404, { error: "Profile not found" });
  }

  const appMatch = url.pathname.match(/^\/games\/app\/(\d+)$/);
  if (appMatch) {
    const games = catalog.getByAppId(appMatch[1]);
    return games.length
      ? sendJson(response, 200, { appId: appMatch[1], items: games })
      : sendJson(response, 404, { error: "Game not found" });
  }

  return sendJson(response, 404, {
    error: "Not found",
    endpoints: [
      "/health",
      "/games",
      "/facets",
      "/games/app/:appId",
      "/profiles?q=:name",
      "/profiles/:inputRecordId",
      "/research/status"
    ]
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Steam game catalog listening on http://0.0.0.0:${port}`);
});

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(`${JSON.stringify(body)}\n`);
}
