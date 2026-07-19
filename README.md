<div align="center">

# clearView

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](#how-it-works)
[![ML](https://img.shields.io/badge/models-anti--spoof%20%2B%20resemblyzer-FF6F00?logo=python&logoColor=white)](#how-it-works)
[![License](https://img.shields.io/badge/license-MIT-8b5cf6)](#license)

</div>

`clearView` is a liveness / deepfake-aware verification app. A FastAPI backend
runs face detection, anti-spoofing, and speaker verification on uploaded media;
a Next.js front end walks a user through capture, shows a live verification
result, and presents an analytics dashboard for reviewers.

## Why

Static "is this a real face?" checks are easy to spoof. `clearView` combines
several signals — MediaPipe face geometry, a Silent-Face anti-spoofing model,
and Resemblyzer voice embeddings — and surfaces them through one verification
flow plus a reviewer dashboard, so a decision has evidence behind it.

## How it works

**Backend** (`python/`):

- `server.py` — FastAPI app with CORS, a `WebSocket` for streaming, and
  `UploadFile` endpoints. Uses OpenCV (`cv2`) + NumPy for frame handling and
  MediaPipe (`face_mesh`, `hands`) for geometry, with safe fallbacks if
  MediaPipe's top-level `solutions` import is unavailable (v0.10+).
- `analytics/` + `auth/` — request analytics and an auth layer for reviewers.
- `vendors/` — bundled models, including `Silent-Face-Anti-Spoofing` and
  `Resemblyzer` for voice embedding comparison.
- `test_phase2.py` — pipeline smoke test; `requirements.txt` pins deps.

**Frontend** (`app/` — Next.js App Router):

- `app/verify/page.tsx` — the capture + verification step.
- `app/dashboard/page.tsx` — reviewer analytics view.
- `app/success/` — post-verification state.
- `lib/`, `hooks/`, `components/` — shared client logic and UI.

`create_audio_test_files.py` and sample clips (`noise.wav`, `silence.wav`,
`monotonic.wav`) support local testing via `test_deepfake.sh`.

## Project structure

```
clearView/
├── app/              # Next.js 16 (verify / dashboard / success)
├── python/           # FastAPI + CV/ML services
│   ├── server.py  auth/  analytics/  vendors/
│   └── test_phase2.py  requirements.txt
├── Silent-Face-Anti-Spoofing-master/
├── Resemblyzer/
└── test_deepfake.sh
```

## Getting started

```bash
# backend
cd python && pip install -r requirements.txt
uvicorn server:app --reload

# frontend
npm install
npm run dev
```

## License

MIT
