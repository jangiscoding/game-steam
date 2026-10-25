#!/usr/bin/env python3
"""Synchronize the current Xbox Game Pass catalog from official Microsoft APIs."""

import argparse
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIGLS = {
    "pc": "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
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
        "fieldsTemplate": "details",
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


def supported_languages(product):
    """Return game languages declared by Microsoft for any currently offered SKU."""
    languages = set()
    for availability in product.get("DisplaySkuAvailabilities") or []:
        sku = availability.get("Sku") or {}
        for market_properties in sku.get("MarketProperties") or []:
            languages.update(
                value.strip().lower()
                for value in market_properties.get("SupportedLanguages") or []
                if isinstance(value, str) and value.strip()
            )
    return sorted(languages)


def pc_package_family_names(product):
    """Return Windows package identities used to detect locally installed Store games."""
    names = set()
    for availability in product.get("DisplaySkuAvailabilities") or []:
        properties = (availability.get("Sku") or {}).get("Properties") or {}
        for package in properties.get("Packages") or []:
            platforms = {
                item.get("PlatformName")
                for item in package.get("PlatformDependencies") or []
            }
            name = package.get("PackageFamilyName")
            if name and "Windows.Desktop" in platforms:
                names.add(name)
    return sorted(names)


def normalize_title(value):
    decomposed = unicodedata.normalize("NFKD", value or "")
    plain = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.findall(r"[a-z0-9]+", plain.casefold()))


def load_vietnamese_patches(path):
    """Index community patches by exact normalized title; never fuzzy-match editions."""
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    index = {}
    for item in (payload.get("items") or {}).values():
        patches = item.get("matches") or [{
            "name": item.get("trName") or item.get("gameName"),
            "source": item.get("source"),
            "link": item.get("link"),
        }]
        names = {item.get("gameName"), item.get("trName")}
        names.update(patch.get("name") for patch in patches)
        normalized_names = {normalize_title(name) for name in names if name}
        for normalized_name in normalized_names - {""}:
            bucket = index.setdefault(normalized_name, [])
            for patch in patches:
                if not patch.get("link"):
                    continue
                record = {
                    "name": patch.get("name") or item.get("trName") or item.get("gameName"),
                    "source": patch.get("source") or item.get("source"),
                    "sourceId": patch.get("sourceId"),
                    "link": patch["link"],
                }
                if record not in bucket:
                    bucket.append(record)
    return index


def normalize_product(product, platforms, patch_index):
    localized = (product.get("LocalizedProperties") or [{}])[0]
    properties = product.get("Properties") or {}
    market_properties = (product.get("MarketProperties") or [{}])[0]
    attributes = [item.get("Name") for item in properties.get("Attributes") or [] if item.get("Name")]
    product_id = product["ProductId"]
    clean = lambda value: value.strip() if isinstance(value, str) and value.strip() else None
    name = clean(localized.get("ProductTitle")) or clean(localized.get("ShortTitle")) or product_id
    languages = supported_languages(product)
    vietnamese_patches = patch_index.get(normalize_title(name), [])
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
        "packageFamilyNames": pc_package_family_names(product),
        "supportedLanguages": languages,
        "supportsVietnamese": any(value == "vi" or value.startswith("vi-") for value in languages),
        "hasVietnamesePatch": bool(vietnamese_patches),
        "vietnamesePatches": vietnamese_patches,
        "releaseDate": market_properties.get("OriginalReleaseDate"),
        "ageRating": rating(market_properties),
        "storeUrl": f"https://www.xbox.com/en-US/games/store/-/{product_id}",
        "lastModified": product.get("LastModifiedDate"),
    }


def build_catalog(market="US", language="vi-vn", workers=6, patch_file=None):
    memberships, sources = fetch_memberships(market, language)
    patch_index = load_vietnamese_patches(patch_file or ROOT / "local-site/data/viethoa_games.json")
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
        normalize_product(products[product_id], memberships[product_id], patch_index)
        for product_id in product_ids
        if product_id in products
    ]
    games.sort(key=lambda item: item["sortName"].casefold())
    missing = sorted(set(product_ids) - set(products))
    return {
        "metadata": {
            "schemaVersion": 3,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "market": market,
            "language": language,
            "totalGames": len(games),
            "pcGames": sum("pc" in item["platforms"] for item in games),
            "vietnameseLanguageGames": sum(item["supportsVietnamese"] for item in games),
            "vietnamesePatchGames": sum(item["hasVietnamesePatch"] for item in games),
            "languageDataAvailableGames": sum(bool(item["supportedLanguages"]) for item in games),
            "missingProductIds": missing,
            "sources": sources,
            "note": "PC Game Pass membership, product metadata and supported languages come from official Microsoft catalog services. Vietnamese patches are exact-title matches from the project's community patch catalog.",
        },
        "games": games,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--market", default="US")
    parser.add_argument("--language", default="vi-vn")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--output", type=Path, default=ROOT / "data/xbox-game-pass.json")
    parser.add_argument("--patch-file", type=Path, default=ROOT / "local-site/data/viethoa_games.json")
    args = parser.parse_args()
    catalog = build_catalog(args.market, args.language, args.workers, args.patch_file)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(catalog['games'])} Xbox Game Pass games to {args.output}")


if __name__ == "__main__":
    main()
