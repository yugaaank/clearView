"""
FastAPI server that wraps the Silent-Face-Anti-Spoofing models.
Run from the repo root:
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload
"""

from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4
import os
import time
from typing import List, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage
from src.utility import parse_model_name

REPO_ROOT = Path(__file__).resolve().parent
MODEL_DIR = REPO_ROOT / "resources" / "anti_spoof_models"

# Server-side safety rails. Tune via env vars without code changes.
MIN_CONFIDENCE = float(os.getenv("SILENTFAS_MIN_CONFIDENCE", "0.98"))
MIN_BBOX_AREA = int(os.getenv("SILENTFAS_MIN_BBOX_AREA", "6400"))  # e.g. 80x80


@contextmanager
def repo_workdir():
    """Ensure relative model paths inside the repo resolve correctly."""
    prev = Path.cwd()
    os.chdir(REPO_ROOT)
    try:
        yield
    finally:
        os.chdir(prev)


def read_image(file_bytes: bytes) -> np.ndarray:
    """Decode an uploaded image into a BGR numpy array."""
    arr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unsupported or corrupted image data")
    return image


class SpoofService:
    """Thin wrapper that keeps models in memory for repeated requests."""

    def __init__(self, device_id: int = 0):
        if not MODEL_DIR.exists():
            raise FileNotFoundError(f"Model directory missing: {MODEL_DIR}")

        with repo_workdir():
            self.predictor = AntiSpoofPredict(device_id=device_id)

        self.cropper = CropImage()
        self.model_paths: List[Path] = sorted(p for p in MODEL_DIR.iterdir() if p.suffix == ".pth")
        if not self.model_paths:
            raise FileNotFoundError(f"No .pth files found in {MODEL_DIR}")

    def _run_single_model(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], model_path: Path) -> np.ndarray:
        h_input, w_input, _, scale = parse_model_name(model_path.name)
        params = {
            "org_img": frame,
            "bbox": bbox,
            "scale": scale,
            "out_w": w_input,
            "out_h": h_input,
            "crop": True,
        }
        if scale is None:
            params["crop"] = False

        patch = self.cropper.crop(**params)
        with repo_workdir():
            return self.predictor.predict(patch, str(model_path))

    def analyze(self, frame: np.ndarray):
        with repo_workdir():
            bbox = self.predictor.get_bbox(frame)

        if bbox is None:
            raise ValueError("No face detected")

        _, _, w, h = bbox
        if w * h < MIN_BBOX_AREA:
            raise ValueError(f"Face too small for reliable decision (area={w*h}, min={MIN_BBOX_AREA})")

        prediction = np.zeros((1, 3))
        per_model = []
        start = time.time()
        for model_path in self.model_paths:
            scores = self._run_single_model(frame, bbox, model_path)
            prediction += scores
            per_model.append({"model": model_path.name, "scores": scores[0].tolist()})
        elapsed = time.time() - start

        label_idx = int(np.argmax(prediction))
        label = "real" if label_idx == 1 else "spoof"
        confidence = float(prediction[0][label_idx] / max(len(self.model_paths), 1))

        # Enforce server-side gating to reduce false accepts from weak signals.
        passed = label == "real" and confidence >= MIN_CONFIDENCE
        if not passed:
            label = "spoof"

        return {
            "label": label,
            "confidence": confidence,
            "passed": passed,
            "bbox": {"x": int(bbox[0]), "y": int(bbox[1]), "w": int(bbox[2]), "h": int(bbox[3])},
            "per_model": per_model,
            "elapsed_ms": int(elapsed * 1000),
        }


app = FastAPI(title="Silent Face Anti-Spoofing API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = SpoofService(device_id=0)


@app.get("/health")
def health():
    return {"status": "ok", "models": [p.name for p in service.model_paths]}


@app.post("/api/challenge")
def issue_challenge():
    """Simple placeholder endpoint to satisfy the frontend flow."""
    challenge_id = str(uuid4())
    return {
        "challenge_id": challenge_id,
        "gesture": "none",
        "instruction": "Keep your face inside the frame",
    }


@app.post("/api/validate")
async def validate_challenge(file: UploadFile = File(...), challenge_id: str | None = None, gesture: str | None = None):
    """Accept an uploaded frame and return success. Gesture is ignored for now."""
    try:
        data = await file.read()
        _ = read_image(data)  # basic sanity check
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    return {
        "success": True,
        "message": "Challenge accepted",
        "challenge_id": challenge_id,
        "gesture": gesture,
    }


@app.post("/analyze")
async def analyze_face(file: UploadFile = File(...)):
    try:
        data = await file.read()
        frame = read_image(data)
        result = service.analyze(frame)
        return {"success": True, **result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive guard for unexpected runtime errors
        raise HTTPException(status_code=500, detail=f"Inference failure: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
