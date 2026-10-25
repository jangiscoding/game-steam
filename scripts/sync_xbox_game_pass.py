#!/usr/bin/env python3
"""Synchronize the current Xbox Game Pass catalog from official Microsoft APIs."""

import argparse
import hashlib
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


def absolute_media_url(value):
    if not isinstance(value, str) or not value.strip():
        return None
    value = value.strip()
    return f"https:{value}" if value.startswith("//") else value


def screenshots(localized, limit=12):
    """Keep distinct official Microsoft Store gameplay screenshots."""
    results = []
    seen = set()
    for image in localized.get("Images") or []:
        if image.get("ImagePurpose") != "Screenshot":
            continue
        url = absolute_media_url(image.get("Uri"))
        if not url or url in seen:
            continue
        seen.add(url)
        results.append({
            "url": url,
            "caption": image.get("Caption"),
            "width": image.get("Width"),
            "height": image.get("Height"),
        })
        if len(results) >= limit:
            break
    return results


def trailers(localized, limit=6):
    """Return official HLS trailers and their Microsoft preview images."""
    results = []
    seen = set()
    videos = sorted(localized.get("CMSVideos") or [], key=lambda item: item.get("SortOrder") or 999)
    for video in videos:
        hls_url = absolute_media_url(video.get("HLS"))
        if not hls_url or hls_url in seen:
            continue
        seen.add(hls_url)
        preview = video.get("PreviewImage") or {}
        results.append({
            "id": video.get("TrailerId"),
            "title": video.get("Caption") or preview.get("Caption") or "Xbox trailer",
            "hlsUrl": hls_url,
            "previewImageUrl": absolute_media_url(preview.get("Uri")),
            "width": video.get("Width"),
            "height": video.get("Height"),
        })
        if len(results) >= limit:
            break
    return results


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


def pc_package_identity_names(product):
    return sorted({name.rsplit("_", 1)[0] for name in pc_package_family_names(product)})


def pc_storage(product):
    """Return the largest declared Windows Desktop package size."""
    sizes = []
    for availability in product.get("DisplaySkuAvailabilities") or []:
        properties = (availability.get("Sku") or {}).get("Properties") or {}
        for package in properties.get("Packages") or []:
            platforms = {item.get("PlatformName") for item in package.get("PlatformDependencies") or []}
            if "Windows.Desktop" not in platforms:
                continue
            install_size = package.get("MaxInstallSizeInBytes") or 0
            download_size = package.get("MaxDownloadSizeInBytes") or 0
            sizes.append(max(install_size, download_size))
    size = max(sizes, default=0)
    if not size:
        return {"bytes": None, "display": None}
    gigabytes = size / 1_000_000_000
    return {"bytes": size, "display": f"{gigabytes:.1f} GB"}


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
    storage = pc_storage(product)
    franchises = [value for value in localized.get("Franchises") or [] if isinstance(value, str) and value.strip()]
    return {
        "id": product_id,
        "name": name,
        "sortName": clean(localized.get("SortTitle")) or name,
        "shortDescription": clean(localized.get("ShortDescription")),
        "description": clean(localized.get("ProductDescription")),
        "descriptionLanguage": clean(localized.get("Language")),
        "developer": clean(localized.get("DeveloperName")),
        "publisher": clean(localized.get("PublisherName")),
        "publisherWebsiteUrl": clean(localized.get("PublisherWebsiteUri")),
        "supportUrl": clean(localized.get("SupportUri")),
        "franchises": franchises,
        "imageUrl": image_url(localized, ("Poster", "BoxArt", "BrandedKeyArt")),
        "heroImageUrl": image_url(localized, ("SuperHeroArt", "Hero", "BrandedKeyArt", "Poster")),
        "screenshots": screenshots(localized),
        "trailers": trailers(localized),
        "storageBytes": storage["bytes"],
        "storageDisplay": storage["display"],
        "genres": properties.get("Categories") or ([properties["Category"]] if properties.get("Category") else []),
        "platforms": sorted(platforms),
        "features": attributes,
        "packageFamilyNames": pc_package_family_names(product),
        "packageIdentityNames": pc_package_identity_names(product),
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
            "schemaVersion": 5,
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
    previous = {}
    if args.output.exists():
        previous = {game["id"]: game for game in json.loads(args.output.read_text(encoding="utf-8")).get("games", [])}
    catalog = build_catalog(args.market, args.language, args.workers, args.patch_file)
    for game in catalog["games"]:
        old = previous.get(game["id"]) or {}
        source = {"shortDescription": game.get("shortDescription"), "description": game.get("description")}
        digest = hashlib.sha256(json.dumps(source, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        if (old.get("translation") or {}).get("sourceHash") == digest:
            for field in ("shortDescriptionVi", "descriptionVi", "translation"):
                if old.get(field) is not None:
                    game[field] = old[field]
    catalog["metadata"]["vietnameseDescriptionGames"] = sum(bool(game.get("descriptionVi")) for game in catalog["games"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(catalog['games'])} Xbox Game Pass games to {args.output}")


if __name__ == "__main__":
    main()
