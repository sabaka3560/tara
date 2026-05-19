"""
Seed product catalog.

Usage:
    cd backend
    python -m scripts.seed_products

Requires GEMINI_API_KEY and SUPABASE_DB_URL in .env or environment.
Idempotent: products are upserted by (title, platform).
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
import time
from typing import Any

import google.generativeai as genai
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMS = 768

# ---------------------------------------------------------------------------
# Curated product catalog — 50 Indian fashion items across 5 categories
# description = the text that gets embedded (rich semantic content)
# ---------------------------------------------------------------------------
PRODUCTS: list[dict[str, Any]] = [
    # ── ETHNIC (10) ──────────────────────────────────────────────────────────
    {
        "title": "Floral Anarkali Kurta Set",
        "description": "anarkali kurta in pink and ivory floral print, georgette fabric, ethnic style, suitable for festive and casual occasions, full flared silhouette",
        "category": "ethnic", "garment_type": "kurta",
        "occasions": ["festive", "casual"], "colors": ["pink", "ivory"],
        "price_inr": 1299, "original_price_inr": 2499,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400",
        "rating": 4.5,
    },
    {
        "title": "Silk Kanjivaram Saree",
        "description": "kanjivaram silk saree in deep ruby red with gold zari border, traditional South Indian weave, ethnic style, suitable for wedding and festive occasions",
        "category": "ethnic", "garment_type": "saree",
        "occasions": ["wedding", "festive"], "colors": ["red", "gold"],
        "price_inr": 3499, "original_price_inr": 5999,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400",
        "rating": 4.8,
    },
    {
        "title": "Embroidered Lehenga Choli",
        "description": "bridal lehenga choli in magenta with heavy zardozi embroidery, net fabric, ethnic style, suitable for wedding and festive occasions, voluminous flare",
        "category": "ethnic", "garment_type": "lehenga",
        "occasions": ["wedding", "festive"], "colors": ["magenta", "gold"],
        "price_inr": 4999, "original_price_inr": 8999,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1617627143233-c02668df7b7c?w=400",
        "rating": 4.7,
    },
    {
        "title": "Lucknowi Chikankari Kurta",
        "description": "chikankari hand-embroidered kurta in off-white cotton, traditional Lucknow craft, ethnic style, suitable for casual and office occasions, straight silhouette",
        "category": "ethnic", "garment_type": "kurta",
        "occasions": ["casual", "office"], "colors": ["white", "cream"],
        "price_inr": 1699, "original_price_inr": 2799,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400",
        "rating": 4.6,
    },
    {
        "title": "Banarasi Silk Dupatta",
        "description": "Banarasi pure silk dupatta in teal with gold brocade weave, ethnic style, traditional Indian accessory, suitable for festive and wedding occasions",
        "category": "ethnic", "garment_type": "dupatta",
        "occasions": ["festive", "wedding"], "colors": ["teal", "gold"],
        "price_inr": 899, "original_price_inr": 1499,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1591085686350-798c0f9faa7f?w=400",
        "rating": 4.4,
    },
    {
        "title": "Printed Cotton Salwar Suit",
        "description": "cotton salwar suit in mustard yellow with block print, Jaipur style, ethnic, suitable for daily wear and casual occasions, comfortable kurta with palazzo pants",
        "category": "ethnic", "garment_type": "salwar",
        "occasions": ["casual", "daily"], "colors": ["mustard", "terracotta"],
        "price_inr": 799, "original_price_inr": 1399,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1504198458649-3128b932f49e?w=400",
        "rating": 4.2,
    },
    {
        "title": "Chanderi Silk Kurta",
        "description": "chanderi silk kurta in pale sage green with subtle woven motifs, semi-ethnic, suitable for office and casual occasions, A-line cut, lightweight fabric",
        "category": "ethnic", "garment_type": "kurta",
        "occasions": ["office", "casual"], "colors": ["sage", "green"],
        "price_inr": 1499, "original_price_inr": 2399,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
        "rating": 4.5,
    },
    {
        "title": "Bandhani Palazzo Set",
        "description": "bandhani tie-dye palazzo set in vibrant red and orange, rayon fabric, ethnic style, suitable for casual and festive occasions, wide-leg palazzo trousers",
        "category": "ethnic", "garment_type": "palazzo",
        "occasions": ["casual", "festive"], "colors": ["red", "orange"],
        "price_inr": 1099, "original_price_inr": 1899,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
        "rating": 4.3,
    },
    {
        "title": "Heavy Embroidery Sharara Set",
        "description": "sharara set with mirror and thread embroidery in deep navy, ethnic style, suitable for wedding and festive occasions, flared sharara pants with short kurta",
        "category": "ethnic", "garment_type": "salwar",
        "occasions": ["wedding", "festive"], "colors": ["navy", "silver"],
        "price_inr": 3299, "original_price_inr": 5499,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1617633800759-e11db8b32f55?w=400",
        "rating": 4.7,
    },
    {
        "title": "Georgette Anarkali Suit",
        "description": "georgette anarkali suit in dusty rose with sequin embroidery, ethnic style, suitable for party and festive occasions, floor-length flared design with churidar",
        "category": "ethnic", "garment_type": "kurta",
        "occasions": ["party", "festive"], "colors": ["dusty rose", "pink"],
        "price_inr": 2199, "original_price_inr": 3799,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400",
        "rating": 4.5,
    },
    # ── WESTERN (10) ─────────────────────────────────────────────────────────
    {
        "title": "Linen Blazer White Co-ord Set",
        "description": "linen blazer and wide-leg trouser co-ord set in white, western style, suitable for office and casual occasions, relaxed tailored silhouette",
        "category": "western", "garment_type": "blazer",
        "occasions": ["office", "casual"], "colors": ["white", "cream"],
        "price_inr": 2499, "original_price_inr": 3999,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1485231183945-fffde7c2cba5?w=400",
        "rating": 4.4,
    },
    {
        "title": "Boho Printed Maxi Dress",
        "description": "boho maxi dress in multicolor floral print, western style, suitable for casual and party occasions, tiered skirt with puff sleeves, lightweight fabric",
        "category": "western", "garment_type": "dress",
        "occasions": ["casual", "party"], "colors": ["multicolor", "floral"],
        "price_inr": 1499, "original_price_inr": 2499,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400",
        "rating": 4.2,
    },
    {
        "title": "Ruched Bodycon Mini Dress",
        "description": "ruched bodycon mini dress in emerald green, western style, suitable for party and casual occasions, figure-hugging stretch fabric, strappy design",
        "category": "western", "garment_type": "dress",
        "occasions": ["party", "casual"], "colors": ["emerald", "green"],
        "price_inr": 999, "original_price_inr": 1799,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400",
        "rating": 4.1,
    },
    {
        "title": "High Waist Barrel Jeans",
        "description": "high waist barrel leg jeans in light blue denim wash, western style, suitable for casual occasions, relaxed fit with tapered hem",
        "category": "western", "garment_type": "jeans",
        "occasions": ["casual", "daily"], "colors": ["blue", "denim"],
        "price_inr": 1799, "original_price_inr": 2999,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=400",
        "rating": 4.3,
    },
    {
        "title": "Pleated Midi Skirt",
        "description": "pleated satin midi skirt in champagne gold, western style, suitable for party and office occasions, flowy A-line silhouette, elastic waistband",
        "category": "western", "garment_type": "skirt",
        "occasions": ["party", "office"], "colors": ["champagne", "gold"],
        "price_inr": 1299, "original_price_inr": 2199,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400",
        "rating": 4.4,
    },
    {
        "title": "Linen Shirt Dress",
        "description": "linen shirt dress in sage green, western minimalist style, suitable for casual and office occasions, relaxed fit with tie waist belt, knee-length",
        "category": "western", "garment_type": "dress",
        "occasions": ["casual", "office"], "colors": ["sage", "green"],
        "price_inr": 1899, "original_price_inr": 3099,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
        "rating": 4.5,
    },
    {
        "title": "Crop Top and Palazzo Combo",
        "description": "printed crop top with matching palazzo pants in peach and white geometric print, western casual style, suitable for casual and party occasions",
        "category": "western", "garment_type": "top",
        "occasions": ["casual", "party"], "colors": ["peach", "white"],
        "price_inr": 799, "original_price_inr": 1399,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
        "rating": 4.0,
    },
    {
        "title": "Wrap Dress Floral Print",
        "description": "wrap dress in watercolor floral print, western romantic style, suitable for casual and party occasions, V-neck, tie waist, midi length",
        "category": "western", "garment_type": "dress",
        "occasions": ["casual", "party"], "colors": ["multicolor", "floral"],
        "price_inr": 1699, "original_price_inr": 2799,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400",
        "rating": 4.3,
    },
    {
        "title": "Satin Slip Dress",
        "description": "satin slip dress in dusty mauve, western minimalist style, suitable for party and casual occasions, bias cut, spaghetti straps, thigh-length",
        "category": "western", "garment_type": "dress",
        "occasions": ["party", "casual"], "colors": ["mauve", "purple"],
        "price_inr": 1199, "original_price_inr": 1999,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=400",
        "rating": 4.2,
    },
    {
        "title": "Oversized Graphic Tee Dress",
        "description": "oversized graphic t-shirt dress in black with abstract print, western streetwear-casual style, suitable for casual and daily occasions",
        "category": "western", "garment_type": "dress",
        "occasions": ["casual", "daily"], "colors": ["black", "white"],
        "price_inr": 699, "original_price_inr": 1199,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "rating": 4.1,
        "image_url": "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400",
    },
    # ── INDO-WESTERN (10) ────────────────────────────────────────────────────
    {
        "title": "Indo-Western Sharara Set",
        "description": "sharara set with embroidered jacket and printed flared pants, indo-western fusion, suitable for party and festive occasions, contemporary ethnic silhouette",
        "category": "indo-western", "garment_type": "salwar",
        "occasions": ["party", "festive"], "colors": ["coral", "gold"],
        "price_inr": 2799, "original_price_inr": 4499,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1614886137568-e0a5a3c4b5a7?w=400",
        "rating": 4.6,
    },
    {
        "title": "Kurta with Denim Jacket Overlay",
        "description": "printed cotton kurta paired with distressed denim jacket, indo-western style, suitable for casual and office occasions, modern fusion look",
        "category": "indo-western", "garment_type": "kurta",
        "occasions": ["casual", "office"], "colors": ["indigo", "blue"],
        "price_inr": 1599, "original_price_inr": 2799,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
        "rating": 4.3,
    },
    {
        "title": "Embroidered Cape Dress",
        "description": "midi dress with embroidered cape overlay in ivory and gold, indo-western fusion, suitable for party and festive occasions, contemporary bridal inspiration",
        "category": "indo-western", "garment_type": "dress",
        "occasions": ["party", "festive"], "colors": ["ivory", "gold"],
        "price_inr": 3499, "original_price_inr": 5799,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1623609163859-ca93c959b98a?w=400",
        "rating": 4.7,
    },
    {
        "title": "Dhoti Pants Blazer Co-ord",
        "description": "dhoti-style pants with structured blazer in pastel lilac, indo-western fusion, suitable for party and office occasions, modern Indian power dressing",
        "category": "indo-western", "garment_type": "blazer",
        "occasions": ["party", "office"], "colors": ["lilac", "purple"],
        "price_inr": 2999, "original_price_inr": 4799,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=400",
        "rating": 4.5,
    },
    {
        "title": "Printed Kaftan Tunic",
        "description": "kaftan-style tunic in block-printed cotton with Ikat motifs, indo-western casual style, suitable for casual and daily occasions, relaxed free-flowing fit",
        "category": "indo-western", "garment_type": "top",
        "occasions": ["casual", "daily"], "colors": ["terracotta", "ochre"],
        "price_inr": 1099, "original_price_inr": 1799,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1513094735237-8f2714d57c13?w=400",
        "rating": 4.2,
    },
    {
        "title": "Lehenga Skirt with Crop Blouse",
        "description": "contemporary lehenga skirt in teal and pink with mirror work, worn with crop blouse, indo-western party style, suitable for party and festive occasions",
        "category": "indo-western", "garment_type": "lehenga",
        "occasions": ["party", "festive"], "colors": ["teal", "pink"],
        "price_inr": 3999, "original_price_inr": 6499,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1617633800759-e11db8b32f55?w=400",
        "rating": 4.6,
    },
    {
        "title": "Structured Kurta Trousers Set",
        "description": "structured straight-cut kurta with tailored trousers in charcoal grey, indo-western formal, suitable for office and formal occasions, minimalist Indian cut",
        "category": "indo-western", "garment_type": "kurta",
        "occasions": ["office", "formal"], "colors": ["charcoal", "grey"],
        "price_inr": 2399, "original_price_inr": 3899,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1530577197743-7adf14294584?w=400",
        "rating": 4.4,
    },
    {
        "title": "Saree Pre-Draped Gown",
        "description": "pre-draped saree gown in navy blue with embellished pallu and train, indo-western fusion, suitable for wedding and festive occasions, effortless saree silhouette",
        "category": "indo-western", "garment_type": "saree",
        "occasions": ["wedding", "festive"], "colors": ["navy", "silver"],
        "price_inr": 4499, "original_price_inr": 7499,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400",
        "rating": 4.8,
    },
    {
        "title": "Palazzo Pants With Embroidered Jacket",
        "description": "flared palazzo pants with embroidered short jacket in mint and gold, indo-western contemporary style, suitable for casual and party occasions",
        "category": "indo-western", "garment_type": "palazzo",
        "occasions": ["casual", "party"], "colors": ["mint", "gold"],
        "price_inr": 1799, "original_price_inr": 2999,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=400",
        "rating": 4.3,
    },
    {
        "title": "Anarkali Blazer Dress",
        "description": "anarkali-inspired blazer dress in deep forest green with brocade panels, indo-western power dressing, suitable for office and party occasions",
        "category": "indo-western", "garment_type": "dress",
        "occasions": ["office", "party"], "colors": ["forest green", "gold"],
        "price_inr": 3199, "original_price_inr": 5199,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
        "rating": 4.6,
    },
    # ── FORMAL (10) ──────────────────────────────────────────────────────────
    {
        "title": "Power Blazer with Trousers",
        "description": "structured wool-blend blazer with wide-leg trousers in classic black, western formal style, suitable for office and formal occasions, professional power dressing",
        "category": "formal", "garment_type": "blazer",
        "occasions": ["office", "formal"], "colors": ["black"],
        "price_inr": 2199, "original_price_inr": 3499,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
        "rating": 4.4,
    },
    {
        "title": "Tailored Pencil Skirt Suit",
        "description": "tailored pencil skirt with matching blazer in navy pinstripe, formal style, suitable for office and formal occasions, classic workwear silhouette",
        "category": "formal", "garment_type": "skirt",
        "occasions": ["office", "formal"], "colors": ["navy", "pinstripe"],
        "price_inr": 3299, "original_price_inr": 5299,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
        "rating": 4.5,
    },
    {
        "title": "Sheath Dress Office Wear",
        "description": "structured sheath dress in charcoal grey crepe, formal minimalist style, suitable for office and formal occasions, knee-length with subtle collar detail",
        "category": "formal", "garment_type": "dress",
        "occasions": ["office", "formal"], "colors": ["charcoal", "grey"],
        "price_inr": 1899, "original_price_inr": 3199,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400",
        "rating": 4.3,
    },
    {
        "title": "Structured Formal Jumpsuit",
        "description": "structured formal jumpsuit in black with wide-leg trousers, western formal style, suitable for office and party occasions, tailored sleeveless design with waist belt",
        "category": "formal", "garment_type": "dress",
        "occasions": ["office", "party"], "colors": ["black"],
        "price_inr": 2599, "original_price_inr": 4299,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400",
        "rating": 4.4,
    },
    {
        "title": "Pastel Silk Blouse",
        "description": "silk blouse in pale lavender, formal elegant style, suitable for office and party occasions, relaxed fit with pearl button placket and bow collar",
        "category": "formal", "garment_type": "top",
        "occasions": ["office", "party"], "colors": ["lavender", "purple"],
        "price_inr": 1499, "original_price_inr": 2499,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
        "rating": 4.5,
    },
    {
        "title": "High Waist Formal Trousers",
        "description": "high waist formal trousers in camel wool blend, formal classic style, suitable for office and formal occasions, straight leg, side slit pockets",
        "category": "formal", "garment_type": "blazer",
        "occasions": ["office", "formal"], "colors": ["camel", "brown"],
        "price_inr": 1999, "original_price_inr": 3299,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1580257403246-96ef3f4c0e2f?w=400",
        "rating": 4.4,
    },
    {
        "title": "Stripe Oxford Shirt",
        "description": "crisp oxford shirt in blue and white stripes, formal western style, suitable for office and casual occasions, regular fit with button-down collar",
        "category": "formal", "garment_type": "top",
        "occasions": ["office", "casual"], "colors": ["blue", "white"],
        "price_inr": 999, "original_price_inr": 1699,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1502163140606-888448ae8cfe?w=400",
        "rating": 4.2,
    },
    {
        "title": "Fitted Midi Skirt Formal",
        "description": "fitted midi skirt in burgundy ponte fabric, formal chic style, suitable for office and party occasions, side zip, slight stretch for comfort",
        "category": "formal", "garment_type": "skirt",
        "occasions": ["office", "party"], "colors": ["burgundy", "wine"],
        "price_inr": 1299, "original_price_inr": 2199,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400",
        "rating": 4.3,
    },
    {
        "title": "Collarless Boxy Blazer",
        "description": "collarless boxy blazer in cream white textured tweed, contemporary formal style, suitable for office and party occasions, statement shoulder, cropped length",
        "category": "formal", "garment_type": "blazer",
        "occasions": ["office", "party"], "colors": ["cream", "white"],
        "price_inr": 2899, "original_price_inr": 4699,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1485231183945-fffde7c2cba5?w=400",
        "rating": 4.6,
    },
    {
        "title": "Pleated Formal Culottes",
        "description": "pleated culottes in forest green crepe, formal contemporary style, suitable for office and casual occasions, wide-leg cropped silhouette with front pleat detail",
        "category": "formal", "garment_type": "skirt",
        "occasions": ["office", "casual"], "colors": ["forest green"],
        "price_inr": 1699, "original_price_inr": 2799,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1530577197743-7adf14294584?w=400",
        "rating": 4.3,
    },
    # ── STREETWEAR (10) ──────────────────────────────────────────────────────
    {
        "title": "Oversized Hoodie Set",
        "description": "oversized hoodie and jogger set in oatmeal beige, streetwear casual style, suitable for casual and daily occasions, soft fleece fabric, relaxed unisex fit",
        "category": "streetwear", "garment_type": "jacket",
        "occasions": ["casual", "daily"], "colors": ["beige", "oatmeal"],
        "price_inr": 999, "original_price_inr": 1799,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
        "rating": 4.1,
    },
    {
        "title": "Utility Cargo Jacket",
        "description": "utility cargo jacket in olive green with multiple pockets, streetwear style, suitable for casual and daily occasions, relaxed oversized fit",
        "category": "streetwear", "garment_type": "jacket",
        "occasions": ["casual", "daily"], "colors": ["olive", "green"],
        "price_inr": 1799, "original_price_inr": 2999,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400",
        "rating": 4.3,
    },
    {
        "title": "Graphic Oversized Sweatshirt",
        "description": "oversized graphic sweatshirt in washed black with slogan print, streetwear style, suitable for casual and daily occasions, dropped shoulder boxy fit",
        "category": "streetwear", "garment_type": "top",
        "occasions": ["casual", "daily"], "colors": ["black"],
        "price_inr": 899, "original_price_inr": 1499,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400",
        "rating": 4.2,
    },
    {
        "title": "Wide Leg Track Pants",
        "description": "wide leg track pants in cobalt blue with white stripe, streetwear athletic style, suitable for casual and sports occasions, relaxed elastic waist",
        "category": "streetwear", "garment_type": "jeans",
        "occasions": ["casual", "sports"], "colors": ["blue", "cobalt"],
        "price_inr": 799, "original_price_inr": 1399,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1539789378513-dc81d26d8a67?w=400",
        "rating": 4.0,
    },
    {
        "title": "Y2K Butterfly Print Mini",
        "description": "Y2K inspired butterfly print mini skirt in pink and black, streetwear retro style, suitable for casual and party occasions, pleated micro mini",
        "category": "streetwear", "garment_type": "skirt",
        "occasions": ["casual", "party"], "colors": ["pink", "black"],
        "price_inr": 699, "original_price_inr": 1199,
        "platform": "flipkart", "affiliate_url": "https://www.flipkart.com",
        "image_url": "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400",
        "rating": 4.1,
    },
    {
        "title": "Varsity Bomber Jacket",
        "description": "varsity bomber jacket in black and white with chenille patches, streetwear preppy style, suitable for casual occasions, classic American collegiate look",
        "category": "streetwear", "garment_type": "jacket",
        "occasions": ["casual", "daily"], "colors": ["black", "white"],
        "price_inr": 2299, "original_price_inr": 3799,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=400",
        "rating": 4.4,
    },
    {
        "title": "Printed Co-ord Biker Set",
        "description": "abstract print co-ord set with biker shorts and matching crop top, streetwear athleisure style, suitable for casual and sports occasions",
        "category": "streetwear", "garment_type": "top",
        "occasions": ["casual", "sports"], "colors": ["multicolor"],
        "price_inr": 1199, "original_price_inr": 1999,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
        "rating": 4.2,
    },
    {
        "title": "Distressed Denim Jacket",
        "description": "distressed denim jacket in light blue wash with raw-edge hem, streetwear casual style, suitable for casual occasions, cropped boyfriend fit",
        "category": "streetwear", "garment_type": "jacket",
        "occasions": ["casual", "daily"], "colors": ["blue", "denim"],
        "price_inr": 1599, "original_price_inr": 2699,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=400",
        "rating": 4.3,
    },
    {
        "title": "Ribbed Tank and Legging Set",
        "description": "ribbed cotton tank top with matching leggings in charcoal, streetwear minimalist athleisure, suitable for sports and casual occasions",
        "category": "streetwear", "garment_type": "top",
        "occasions": ["sports", "casual"], "colors": ["charcoal", "grey"],
        "price_inr": 899, "original_price_inr": 1499,
        "platform": "nykaa", "affiliate_url": "https://www.nykaafashion.com",
        "image_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
        "rating": 4.1,
    },
    {
        "title": "Chunky Knit Cardigan",
        "description": "chunky oversized knit cardigan in cream with contrast stripe, streetwear cozy style, suitable for casual and daily occasions, open-front relaxed fit",
        "category": "streetwear", "garment_type": "jacket",
        "occasions": ["casual", "daily"], "colors": ["cream", "beige"],
        "price_inr": 1499, "original_price_inr": 2499,
        "platform": "myntra", "affiliate_url": "https://www.myntra.com",
        "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
        "rating": 4.4,
    },
]

# ---------------------------------------------------------------------------
# Embedding + DB logic
# ---------------------------------------------------------------------------

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch-embed texts using Gemini text-embedding-004 with rate-limit backoff."""
    embeddings: list[list[float]] = []
    for i, t in enumerate(texts):
        try:
            result = genai.embed_content(
                model=EMBEDDING_MODEL,
                content=t,
                task_type="RETRIEVAL_DOCUMENT",
            )
            embeddings.append(result["embedding"])
            logger.info("  embedded %d/%d", i + 1, len(texts))
        except Exception as exc:
            logger.error("  embed failed for index %d: %s", i, exc)
            embeddings.append([0.0] * EMBEDDING_DIMS)
        # Gemini free-tier rate limit: ~60 req/min
        if i < len(texts) - 1:
            time.sleep(1.1)
    return embeddings


async def seed(db_url: str, gemini_key: str) -> None:
    genai.configure(api_key=gemini_key)

    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    descriptions = [p["description"] for p in PRODUCTS]
    logger.info("Embedding %d products…", len(descriptions))
    embeddings = await embed_texts(descriptions)

    async with async_session() as session:
        for product, embedding in zip(PRODUCTS, embeddings):
            vec_str = f"[{','.join(str(x) for x in embedding)}]"
            await session.execute(
                text(
                    """
                    INSERT INTO products (
                      title, description, category, garment_type, occasions, colors,
                      price_inr, original_price_inr, platform, affiliate_url, image_url,
                      rating, embedding
                    ) VALUES (
                      :title, :description, :category, :garment_type, :occasions, :colors,
                      :price_inr, :original_price_inr, :platform, :affiliate_url, :image_url,
                      :rating, :embedding::vector(768)
                    )
                    ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "title": product["title"],
                    "description": product["description"],
                    "category": product["category"],
                    "garment_type": product["garment_type"],
                    "occasions": product["occasions"],
                    "colors": product["colors"],
                    "price_inr": product["price_inr"],
                    "original_price_inr": product.get("original_price_inr"),
                    "platform": product["platform"],
                    "affiliate_url": product["affiliate_url"],
                    "image_url": product["image_url"],
                    "rating": product.get("rating"),
                    "embedding": vec_str,
                },
            )
            logger.info("  upserted: %s", product["title"])
        await session.commit()

    await engine.dispose()
    logger.info("Done. %d products seeded.", len(PRODUCTS))


if __name__ == "__main__":
    db_url = os.environ.get("SUPABASE_DB_URL", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")

    if not db_url:
        logger.error("SUPABASE_DB_URL not set")
        sys.exit(1)
    if not gemini_key:
        logger.error("GEMINI_API_KEY not set")
        sys.exit(1)

    asyncio.run(seed(db_url, gemini_key))
