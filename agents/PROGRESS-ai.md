# Agent: AI Pipeline
# Branch: agent-ai
# Owns: backend/services/classifier.py, backend/workers/**
# Phase: 0

## Status: COMPLETE

## Phase 0 Checklist
- [x] Gemini API key verified (test classify call)
- [x] Anthropic API key verified (test haiku call)
- [x] preprocess_image() tested: input 4MB → output <50KB, 512x512
- [x] EXIF rotation fix verified on sideways phone photo
- [x] Prompt caching verified: cache_creation_input_tokens > 0 on first call
- [x] safe_json() handles malformed Gemini output without crash

## Blocked By
Nothing — can start immediately.

## Decisions Log
- Gemini 2.5 Flash-Lite for vision (156x cheaper than Claude)
- Claude Haiku 4.5 for text reasoning
- ML Kit on-device pre-filter to reject non-clothing before API call
