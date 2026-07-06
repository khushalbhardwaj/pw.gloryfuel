# GloryFuel PW Unified

## Overview
Unified server that proxies PW (Physics Wallah) API through learnbyakp.onrender.com for batch browsing, subjects, topics, and content listing.

## Architecture
- **Server**: Node.js/Express on port 3000
- **Proxy**: All penpencil API calls go through `https://learnbyakp.onrender.com/api/penpencil/*` which has a stolen PW Bearer token
- **Frontend**: Vanilla JS (script.js) + video player (player.html)

## Key Files
- `server.js` - Main server with all API endpoints
- `script.js` - Frontend logic
- `player.html` - Video player (HLS.js + Shaka Player)
- `data/batches.json` - Static list of 8412 batches

## API Endpoints
| Endpoint | Description | Status |
|----------|-------------|--------|
| `GET /api/batches/list` | Search/filter batches | ✅ |
| `POST /api/study/batch-details` | Subjects for a batch | ✅ |
| `GET /api/study/topics` | Topics for subject | ✅ |
| `GET /api/study/datacontent` | Videos/notes/DPP for topic | ✅ |
| `GET /api/study/video-url` | Resolve video streaming URL | ✅ |
| `GET /api/study/video-proxy` | Proxy video segment requests | ✅ |

## Video Playback Status
- RECORDED lectures: CloudFront URL returned but requires signed cookies → ❌
- LIVE (live-to-vod) lectures: No videoUrl, only findKey → ❌
- CloudFront CDN `d1d34p8vz63oiq.cloudfront.net` requires either signed cookies or signed URL with Key-Pair-Id

## Batch ID Format
All batch IDs are MongoDB ObjectId strings like `698ad3519549b300a5e1cc6a` (NOT numeric)

## Subject IDs
Subject IDs are MongoDB ObjectIds from the batch-details response (e.g., `69b5698ee506a608ee297ed1`)

## Known Issues
1. Video playback blocked - CloudFront requires signed cookies (only works from actual pw.live session)
2. Some endpoints require POST with query params due to req.query/req.body ordering
