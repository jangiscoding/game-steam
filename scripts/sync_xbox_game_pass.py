#!/usr/bin/env python3
"""Synchronize the current Xbox Game Pass catalog from official Microsoft APIs."""

import argparse
import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIGLS = {
    "pc": "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
    "console": "29a81209-df6f-41fd-a528-2ae6b91f719c",
}
USER_AGENT = "Jang-Play-Xbox-Game-Pass-Sync/1.0"


def fetch_json(url, retries=4):
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except Exception:
            if attempt == retries:
                raise
            time.sleep(min(2 ** attempt, 15))


def fetch_memberships(market, language):
    memberships = {}
    sources = []
    for platform, sigl_id in SIGLS.items():
        query = urllib.parse.urlencode({"id": sigl_id, "language": language, "market": market})
        url = f"https://catalog.gamepass.com/sigls/v2?{query}"
        payload = fetch_json(url)
        header = payload[0] if payload and "siglId" in payload[0] else {}
        product_ids = [item["id"] for item in payload if item.get("id")]
        for product_id in product_ids:
            memberships.setdefault(product_id, set()).add(platform)
        sources.append({
            "platform": platform,
            "siglId": sigl_id,
            "title": header.get("title"),
            "products": len(product_ids),
            "url": url,
        })
    return memberships, sources


def chunks(values, size):
    for index in range(0, len(values), size):
        yield values[index:index + size]


def fetch_product_batch(product_ids, market, language):
    query = urllib.parse.urlencode({
        "bigIds": ",".join(product_ids),
        "market": market,
        "languages": language,
        "MS-CV": "JangPlayXboxCatalog",
    })
    url = f"https://displaycatalog.mp.microsoft.com/v7.0/products?{query}"
    return fetch_json(url).get("Products", [])


def image_url(localized, purposes):
    images = localized.get("Images") or []
    for purpose in purposes:
        match = next((item for item in images if item.get("ImagePurpose") == purpose and item.get("Uri")), None)
        if match:
            uri = match["Uri"]
            return f"https:{uri}" if uri.startswith("//") else uri
    return None


def rating(market_properties):
    ratings = market_properties.get("ContentRatings") or []
    preferred = next((item for item in ratings if item.get("RatingSystem") == "ESRB"), None)
    selected = preferred or (ratings[0] if ratings else None)
    return selected.get("RatingId") if selected else None


def normalize_product(product, platforms):
    localized = (product.get("LocalizedProperties") or [{}])[0]
    properties = product.get("Properties") or {}
    market_properties = (product.get("MarketProperties") or [{}])[0]
    attributes = [item.get("Name") for item in properties.get("Attributes") or [] if item.get("Name")]
    product_id = product["ProductId"]
    clean = lambda value: value.strip() if isinstance(value, str) and value.strip() else None
    name = clean(localized.get("ProductTitle")) or clean(localized.get("ShortTitle")) or product_id
    return {
        "id": product_id,
        "name": name,
        "sortName": clean(localized.get("SortTitle")) or name,
        "shortDescription": clean(localized.get("ShortDescription")),
        "developer": clean(localized.get("DeveloperName")),
        "publisher": clean(localized.get("PublisherName")),
        "imageUrl": image_url(localized, ("Poster", "BoxArt", "BrandedKeyArt")),
        "heroImageUrl": image_url(localized, ("SuperHeroArt", "Hero", "BrandedKeyArt", "Poster")),
        "genres": properties.get("Categories") or ([properties["Category"]] if properties.get("Category") else []),
        "platforms": sorted(platforms),
        "features": attributes,
        "releaseDate": market_properties.get("OriginalReleaseDate"),
        "ageRating": rating(market_properties),
        "storeUrl": f"https://www.xbox.com/en-US/games/store/-/{product_id}",
        "lastModified": product.get("LastModifiedDate"),
    }


def build_catalog(market="US", language="vi-vn", workers=6):
    memberships, sources = fetch_memberships(market, language)
    product_ids = sorted(memberships)
    products = {}
    batches = list(chunks(product_ids, 20))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(fetch_product_batch, batch, market, language): batch
            for batch in batches
        }
        for completed, future in enumerate(as_completed(futures), 1):
            for product in future.result():
                products[product["ProductId"]] = product
            print(f"Xbox product metadata: {completed}/{len(batches)} batches", flush=True)

    games = [
        normalize_product(products[product_id], memberships[product_id])
        for product_id in product_ids
        if product_id in products
    ]
    games.sort(key=lambda item: item["sortName"].casefold())
    missing = sorted(set(product_ids) - set(products))
    return {
        "metadata": {
            "schemaVersion": 1,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "market": market,
            "language": language,
            "totalGames": len(games),
            "pcGames": sum("pc" in item["platforms"] for item in games),
            "consoleGames": sum("console" in item["platforms"] for item in games),
            "missingProductIds": missing,
            "sources": sources,
            "note": "Game Pass membership and product metadata come from official Microsoft catalog services.",
        },
        "games": games,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--market", default="US")
    parser.add_argument("--language", default="vi-vn")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--output", type=Path, default=ROOT / "data/xbox-game-pass.json")
    args = parser.parse_args()
    catalog = build_catalog(args.market, args.language, args.workers)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(catalog['games'])} Xbox Game Pass games to {args.output}")


if __name__ == "__main__":
    main()
