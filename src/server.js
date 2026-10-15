import { createServer } from "node:http";
import { GameCatalog } from "./catalog.js";

const catalog = await GameCatalog.load();
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

  const appMatch = url.pathname.match(/^\/games\/app\/(\d+)$/);
  if (appMatch) {
    const games = catalog.getByAppId(appMatch[1]);
    return games.length
      ? sendJson(response, 200, { appId: appMatch[1], items: games })
      : sendJson(response, 404, { error: "Game not found" });
  }

  return sendJson(response, 404, {
    error: "Not found",
    endpoints: ["/health", "/games", "/facets", "/games/app/:appId"]
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
