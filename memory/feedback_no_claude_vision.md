---
name: feedback-no-claude-vision
description: Never use Claude for image classification — use Gemini Flash-Lite instead (30x cheaper)
metadata:
  type: feedback
---

Never recommend Claude Vision for image classification tasks in this project.

**Why:** Claude claude-sonnet-4-6 vision costs ~$0.375 for 50 clothing images. Gemini 2.5 Flash-Lite costs ~$0.0024 for the same — 156x cheaper after image compression. User explicitly flagged this as too expensive.

**How to apply:** Use Gemini 2.5 Flash-Lite for all image → structured data tasks. Use Claude Haiku (text only) for outfit reasoning. Use Claude Sonnet only for premium user features if ever needed.
