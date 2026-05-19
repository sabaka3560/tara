"""Multi-source shopping search: SerpAPI (primary), Flipkart Affiliate, Amazon PA API."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import urllib.parse
from datetime import datetime, timezone
from typing import Any

import httpx

from backend.core.config import settings

# ---------------------------------------------------------------------------
# Shared product schema
# ---------------------------------------------------------------------------

def _product(
    *,
    title: str,
    price: float,
    original_price: float | None,
    image_url: str,
    affiliate_url: str,
    platform: str,
    rating: float | None = None,
    category: str = "fashion",
    source: str,
) -> dict[str, Any]:
    return {
        "id": hashlib.md5(affiliate_url.encode()).hexdigest()[:12],
        "title": title,
        "price": price,
        "originalPrice": original_price,
        "image_url": image_url,
        "affiliate_url": affiliate_url,
        "platform": platform,
        "rating": rating,
        "category": category,
        "source": source,
    }


# ---------------------------------------------------------------------------
# SerpAPI — Google Shopping (returns Myntra / Nykaa / Flipkart / Amazon hits)
# ---------------------------------------------------------------------------

_SERP_PLATFORM_MAP = {
    "myntra.com": "myntra",
    "nykaa": "nykaa",
    "flipkart.com": "flipkart",
    "amazon.in": "amazon",
    "meesho.com": "meesho",
}


def _detect_platform(url: str) -> str:
    low = url.lower()
    for fragment, name in _SERP_PLATFORM_MAP.items():
        if fragment in low:
            return name
    return "web"


async def _search_serp(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.SERPAPI_KEY:
        return []
    params = {
        "engine": "google_shopping",
        "q": query,
        "gl": "in",
        "hl": "en",
        "currency": "INR",
        "num": str(limit),
        "api_key": settings.SERPAPI_KEY,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get("https://serpapi.com/search", params=params)
        resp.raise_for_status()
    results = resp.json().get("shopping_results", [])
    products: list[dict[str, Any]] = []
    for r in results[:limit]:
        price_raw = r.get("price", "")
        try:
            price = float(str(price_raw).replace("₹", "").replace(",", "").strip())
        except ValueError:
            continue
        link = r.get("link") or r.get("product_link", "")
        if not link:
            continue
        products.append(
            _product(
                title=r.get("title", ""),
                price=price,
                original_price=None,
                image_url=r.get("thumbnail", ""),
                affiliate_url=link,
                platform=_detect_platform(link),
                rating=r.get("rating"),
                source="serp",
            )
        )
    return products


# ---------------------------------------------------------------------------
# Flipkart Affiliate API
# ---------------------------------------------------------------------------

async def _search_flipkart(query: str, limit: int) -> list[dict[str, Any]]:
    if not settings.FLIPKART_AFFILIATE_ID or not settings.FLIPKART_AFFILIATE_TOKEN:
        return []
    params = {"query": query, "resultCount": str(limit)}
    headers = {
        "Fk-Affiliate-Id": settings.FLIPKART_AFFILIATE_ID,
        "Fk-Affiliate-Token": settings.FLIPKART_AFFILIATE_TOKEN,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://affiliate-api.flipkart.net/affiliate/search/json",
            params=params,
            headers=headers,
        )
        resp.raise_for_status()
    data = resp.json()
    products_raw = (
        data.get("apiGroups", [{}])[0]
        .get("apiListings", {})
        .values()
    )
    products: list[dict[str, Any]] = []
    for listing in products_raw:
        info = listing.get("productBaseInfoV1", {})
        price_info = info.get("flipkartSpecialPrice", info.get("flipkartSellingPrice", {}))
        try:
            price = float(price_info.get("amount", 0))
        except (ValueError, TypeError):
            continue
        url = info.get("productUrl", "")
        if not url or not price:
            continue
        products.append(
            _product(
                title=info.get("title", ""),
                price=price,
                original_price=None,
                image_url=info.get("imageUrls", {}).get("400x400", ""),
                affiliate_url=url,
                platform="flipkart",
                rating=info.get("overallRating"),
                source="flipkart",
            )
        )
    return products[:limit]


# ---------------------------------------------------------------------------
# Amazon Product Advertising API v5 (signed requests)
# ---------------------------------------------------------------------------

def _amz_sign(secret: str, date_str: str, region: str, service: str, string_to_sign: str) -> str:
    def _hmac(key: bytes, msg: str) -> bytes:
        return hmac.new(key, msg.encode(), "sha256").digest()

    k_date = _hmac(("AWS4" + secret).encode(), date_str)
    k_region = _hmac(k_date, region)
    k_service = _hmac(k_region, service)
    k_signing = _hmac(k_service, "aws4_request")
    return hmac.new(k_signing, string_to_sign.encode(), "sha256").hexdigest()


async def _search_amazon(query: str, limit: int) -> list[dict[str, Any]]:
    if not (settings.AMAZON_ACCESS_KEY and settings.AMAZON_SECRET_KEY and settings.AMAZON_ASSOC_TAG):
        return []

    host = "webservices.amazon.in"
    region = "eu-west-1"
    service = "ProductAdvertisingAPI"

    now = datetime.now(tz=timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_str = now.strftime("%Y%m%d")

    payload = {
        "Keywords": query,
        "PartnerTag": settings.AMAZON_ASSOC_TAG,
        "PartnerType": "Associates",
        "Marketplace": "www.amazon.in",
        "Operation": "SearchItems",
        "Resources": ["Images.Primary.Medium", "ItemInfo.Title", "Offers.Listings.Price"],
        "ItemCount": limit,
    }
    import json
    body = json.dumps(payload)
    body_hash = hashlib.sha256(body.encode()).hexdigest()

    canonical = "\n".join([
        "POST",
        "/paapi5/searchitems",
        "",
        f"content-type:application/json; charset=utf-8\nhost:{host}\nx-amz-date:{amz_date}\n",
        "content-type;host;x-amz-date",
        body_hash,
    ])
    credential_scope = f"{date_str}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        credential_scope,
        hashlib.sha256(canonical.encode()).hexdigest(),
    ])
    signature = _amz_sign(settings.AMAZON_SECRET_KEY, date_str, region, service, string_to_sign)

    auth = (
        f"AWS4-HMAC-SHA256 Credential={settings.AMAZON_ACCESS_KEY}/{credential_scope}, "
        "SignedHeaders=content-type;host;x-amz-date, "
        f"Signature={signature}"
    )
    headers = {
        "content-type": "application/json; charset=utf-8",
        "host": host,
        "x-amz-date": amz_date,
        "Authorization": auth,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"https://{host}/paapi5/searchitems",
            content=body,
            headers=headers,
        )
        resp.raise_for_status()

    items = resp.json().get("SearchResult", {}).get("Items", [])
    products: list[dict[str, Any]] = []
    for item in items[:limit]:
        title = item.get("ItemInfo", {}).get("Title", {}).get("DisplayValue", "")
        listing = (item.get("Offers", {}).get("Listings") or [{}])[0]
        try:
            price = float(listing.get("Price", {}).get("Amount", 0))
        except (ValueError, TypeError):
            continue
        image = item.get("Images", {}).get("Primary", {}).get("Medium", {}).get("URL", "")
        url = item.get("DetailPageURL", "")
        if not url or not price:
            continue
        products.append(
            _product(
                title=title,
                price=price,
                original_price=None,
                image_url=image,
                affiliate_url=url,
                platform="amazon",
                source="amazon",
            )
        )
    return products


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def search_all(query: str, limit: int = 20) -> list[dict[str, Any]]:
    """Run all available sources concurrently, merge, deduplicate by URL."""
    per_source = max(limit, 10)
    results = await asyncio.gather(
        _search_serp(query, per_source),
        _search_flipkart(query, per_source),
        _search_amazon(query, per_source),
        return_exceptions=True,
    )

    seen_urls: set[str] = set()
    merged: list[dict[str, Any]] = []
    for batch in results:
        if isinstance(batch, Exception):
            continue
        for p in batch:
            url = p["affiliate_url"]
            if url not in seen_urls:
                seen_urls.add(url)
                merged.append(p)

    # SerpAPI results first (most relevant), then supplementary sources
    merged.sort(key=lambda p: (p["source"] != "serp", p["source"]))
    return merged[:limit]
