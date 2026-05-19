---
name: project-wardrobe
description: AI Wardrobe OS — product decisions, stack, and monetization for Indian women fashion app
metadata:
  type: project
---

**Product:** AI Wardrobe OS — free app for Indian women, catalogs clothes via photo, builds outfit combinations, recommends what to buy next.

**Stack:** React Native (Android first) + FastAPI + Supabase + Redis + Gemini Flash-Lite (vision) + Claude Haiku (text/outfits) + LangGraph (agent) + pgvector.

**Monetization:** Affiliate links (Myntra 7.5%, Nykaa 9%) + rewarded ads (AdMob mediation with Meta Audience Network) + native ads. No paywall on core features — free grows virally.

**Why:** Indian skin tones + Indian garments (saree, kurta, lehenga) = completely underserved by Western apps. India is highest growth region for wardrobe apps in 2026.

**Moat:** Longitudinal wardrobe data per user. Switching cost is extreme once 100+ items cataloged.

**Key docs:** ARCHITECTURE.md (full stack), DESIGN.md (problems + decisions), CLAUDE.md (coding rules).

**Why:** India market, 1B smartphone users, no strong AI wardrobe competitor for Indian fashion.
**How to apply:** All product decisions should optimize for Indian context first (garments, price points ₹500–3000, Android, Hindi/English).
