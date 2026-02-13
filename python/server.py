# server.py
from fastapi import FastAPI, WebSocket, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import os
import sys
from pathlib import Path
from contextlib import contextmanager
# Mediapipe compatibility (v0.10+ removes top-level solutions)
try:
    import mediapipe as mp
    _mp_solutions = getattr(mp, "solutions", None)
    FaceMesh = getattr(_mp_solutions, "face_mesh", None)
    Hands = getattr(_mp_solutions, "hands", None)
except ImportError:
    mp = None
    FaceMesh = Hands = None
import base64
import time
from collections import deque

@contextmanager
def _workdir(path: Path):
    """Temporarily change working directory."""
    prev = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev)


def load_anti_spoof_model():
    """
    Attempt to load Silent-Face-Anti-Spoofing from vendored path or import if installed.
    Prefers AntiSpoofPredict from the official repo (class name differs).
    """
    base_path = Path(os.environ.get("ANTI_SPOOF_PATH", "vendors/Silent-Face-Anti-Spoofing")).resolve()
    alt_path = Path("vendors/Silent-Face-Anti-Spoofing-master").resolve()
    repo_path = None
    for path in (base_path, alt_path):
        if path.exists():
            repo_path = path
            sys.path.append(str(path))
            break

    if repo_path:
        try:
            from src.anti_spoof_predict import AntiSpoofPredict
            from src.generate_patches import CropImage
            from src.utility import parse_model_name

            class SpoofModelWrapper:
                def __init__(self):
                    # AntiSpoofPredict expects working dir containing ./resources/...
                    with _workdir(repo_path):
                        self.model = AntiSpoofPredict(device_id=0)
                    self.cropper = CropImage()
                    self.model_dir = repo_path / "resources" / "anti_spoof_models"

                def predict(self, frame):
                    # frame expected in BGR
                    h, w, _ = frame.shape
                    with _workdir(repo_path):
                        bbox = self.model.get_bbox(frame)
                    if bbox is None:
                        return 0
                    prediction = np.zeros((1, 3))
                    for model_name in os.listdir(self.model_dir):
                        model_path = self.model_dir / model_name
                        if not model_path.is_file():
                            continue
                        h_input, w_input, model_type, scale = parse_model_name(model_name)
                        param = {
                            "org_img": frame,
                            "bbox": bbox,
                            "scale": scale,
                            "out_w": w_input,
                            "out_h": h_input,
                            "crop": True,
                        }
                        if scale is None:
                            param["crop"] = False
                        img = self.cropper.crop(**param)
                        with _workdir(repo_path):
                            prediction += self.model.predict(img, str(model_path))

                    label = int(np.argmax(prediction))
                    return 1 if label == 1 else 0

            return SpoofModelWrapper(), True
        except Exception as e:
            print(f"Anti-spoof load error: {e}")

    # Fallback stub to keep the API running if the model package is absent.
    class _StubAntiSpoofing:  # type: ignore
        def predict(self, frame):
            # Conservative default: treat as spoof so the pipeline fails closed.
            return 0

    return _StubAntiSpoofing(), False


app = FastAPI()

# CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load CV models once at startup
anti_spoof, ANTI_SPOOF_AVAILABLE = load_anti_spoof_model()

if FaceMesh and hasattr(FaceMesh, "FaceMesh"):
    mp_face = FaceMesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    )
else:
    mp_face = None

if Hands and hasattr(Hands, "Hands"):
    mp_hands = Hands.Hands(
        max_num_hands=2,
        min_detection_confidence=0.5
    )
else:
    mp_hands = None

# Detect multipart support at runtime to avoid startup crash
try:
    import multipart  # type: ignore  # noqa: F401
    MULTIPART_AVAILABLE = True
except ImportError:
    MULTIPART_AVAILABLE = False

class _EmptyResult:
    multi_face_landmarks = None
    multi_hand_landmarks = None


class LivenessValidator:
    def __init__(self):
        self.blink_count = 0
        self.prev_eye_closed = False
        self.wave_x_history = deque(maxlen=15)

    def detect_liveness(self, frame):
        """Use Silent-Face-Anti-Spoofing model (predict may return logits or label)"""
        result = anti_spoof.predict(frame)
        # Some implementations return 1/0, others return label string
        if isinstance(result, (list, tuple)) and len(result) > 0:
            result = result[0]
        if isinstance(result, str):
            return result.lower() in {"real", "live", "1", "true"}
        return result == 1

    def detect_blink(self, face_landmarks):
        """Calculate Eye Aspect Ratio"""
        # Left eye landmarks: 33, 160, 158, 133, 153, 144
        # Right eye landmarks: 362, 385, 387, 263, 373, 380

        left_eye = self._get_eye_landmarks(face_landmarks, 'left')
        right_eye = self._get_eye_landmarks(face_landmarks, 'right')

        left_ear = self._eye_aspect_ratio(left_eye)
        right_ear = self._eye_aspect_ratio(right_eye)

        avg_ear = (left_ear + right_ear) / 2

        eye_closed = avg_ear < 0.2  # Eye is closed
        blink_event = eye_closed and not self.prev_eye_closed
        self.prev_eye_closed = eye_closed

        if blink_event:
            self.blink_count += 1
        return blink_event

    def _eye_aspect_ratio(self, eye_points):
        # Vertical distances
        v1 = np.linalg.norm(eye_points[1] - eye_points[5])
        v2 = np.linalg.norm(eye_points[2] - eye_points[4])
        # Horizontal distance
        h = np.linalg.norm(eye_points[0] - eye_points[3])

        return (v1 + v2) / (2.0 * h)

    def _get_eye_landmarks(self, face_landmarks, side):
        """Extract 6 eye landmark points for EAR calculation"""
        if side == 'left':
            indices = [33, 160, 158, 133, 153, 144]
        else:
            indices = [362, 385, 387, 263, 373, 380]

        return face_landmarks[indices]

    def detect_smile(self, face_landmarks):
        """Check mouth aspect ratio"""
        # Mouth landmarks: 61, 291, 0, 17
        mouth_left = face_landmarks[61]
        mouth_right = face_landmarks[291]
        mouth_top = face_landmarks[0]
        mouth_bottom = face_landmarks[17]

        width = np.linalg.norm(mouth_left - mouth_right)
        height = np.linalg.norm(mouth_top - mouth_bottom)

        if height <= 1e-6:
            return False

        ratio = width / height
        return ratio > 3.5  # Smile threshold

    def detect_head_turn(self, face_landmarks, direction):
        """Check head pose angle"""
        nose = face_landmarks[1]
        left_eye = face_landmarks[33]
        right_eye = face_landmarks[263]

        eye_center = (left_eye + right_eye) / 2
        angle = np.arctan2(nose[1] - eye_center[1], nose[0] - eye_center[0])

        if direction == 'left':
            return angle < -0.3
        elif direction == 'right':
            return angle > 0.3
        return False

    def detect_wave(self, hand_landmarks, frame_width):
        """Check if hand is raised and waving (lateral oscillation)"""
        if hand_landmarks is None or hand_landmarks.size == 0:
            self.wave_x_history.clear()
            return False

        wrist = hand_landmarks[0]
        middle_finger_tip = hand_landmarks[12]

        # Hand is raised if wrist y < 0.5 (top of frame) and fingers extended
        hand_raised = wrist[1] < 0.5 and middle_finger_tip[1] < wrist[1]
        if not hand_raised:
            self.wave_x_history.clear()
            return False

        # Track horizontal movement of the wrist to detect oscillation
        self.wave_x_history.append(wrist[0])
        if len(self.wave_x_history) < 5:
            return False

        positions = np.array(self.wave_x_history)
        amplitude = positions.ptp()  # max - min
        threshold = max(40.0, 0.05 * frame_width)  # pixels

        # Count direction changes (left/right)
        diffs = np.diff(positions)
        dirs = np.sign(diffs)
        dirs = dirs[dirs != 0]
        if len(dirs) < 2:
            return False
        switches = np.sum(dirs[1:] != dirs[:-1])

        return amplitude > threshold and switches >= 2


validator = LivenessValidator()
CHALLENGES = [
    {"id": 1, "gesture": "smile", "instruction": "Smile at the camera"},
    {"id": 2, "gesture": "blink", "instruction": "Blink twice"},
    {"id": 3, "gesture": "turn_left", "instruction": "Turn your head left"},
    {"id": 4, "gesture": "turn_right", "instruction": "Turn your head right"},
    {"id": 5, "gesture": "wave", "instruction": "Wave your right hand"},
]


def process_frame(frame: np.ndarray):
    """Run CV validations on a single frame and return result dict."""
    h, w, _ = frame.shape
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # 1. Liveness detection (fails closed if model missing)
    is_live = validator.detect_liveness(frame)

    # 2. Face detection
    face_results = mp_face.process(frame_rgb) if mp_face else _EmptyResult()

    # 3. Hand detection
    hand_results = mp_hands.process(frame_rgb) if mp_hands else _EmptyResult()

    results = {
        "liveness": is_live,
        "spoof_model_loaded": ANTI_SPOOF_AVAILABLE,
        "face_detected": face_results.multi_face_landmarks is not None,
        "blink_detected": False,
        "smile_detected": False,
        "head_turn_left": False,
        "head_turn_right": False,
        "wave_detected": False,
    }

    if face_results.multi_face_landmarks:
        landmarks = face_results.multi_face_landmarks[0]
        face_points = np.array([[lm.x * w, lm.y * h, lm.z] for lm in landmarks.landmark])

        results["blink_detected"] = validator.detect_blink(face_points)
        results["smile_detected"] = validator.detect_smile(face_points)
        results["head_turn_left"] = validator.detect_head_turn(face_points, "left")
        results["head_turn_right"] = validator.detect_head_turn(face_points, "right")

    if hand_results.multi_hand_landmarks:
        hand_landmarks = hand_results.multi_hand_landmarks[0]
        hand_points = np.array([[lm.x * w, lm.y * h, lm.z] for lm in hand_landmarks.landmark])
        results["wave_detected"] = validator.detect_wave(hand_points, frame_width=w)

    return results


@app.post("/api/challenge")
async def generate_challenge():
    """Generate random challenge"""
    import random
    challenge = random.choice(CHALLENGES)
    return {
        "success": True,
        "challenge": challenge,
        "timestamp": int(time.time())
    }


UploadType = UploadFile if MULTIPART_AVAILABLE else bytes
UploadParam = File(...) if MULTIPART_AVAILABLE else Body(..., media_type="application/octet-stream")


@app.post("/api/validate")
async def validate_frame(file: UploadType = UploadParam):
    """
    Receive frame from frontend, run CV validation
    """
    # Read image
    contents = await file.read() if not isinstance(file, bytes) else file
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return {"success": False, "error": "Invalid frame"}

    results = process_frame(frame)

    return {
        "success": True,
        "results": results,
        "timestamp": int(time.time())
    }


@app.websocket("/ws/video")
async def video_stream(websocket: WebSocket):
    """
    Real-time video stream processing (optional, for live feedback)
    """
    await websocket.accept()

    try:
        while True:
            # Receive frame as base64
            data = await websocket.receive_text()

            # Decode base64 to image
            if "," in data:
                _, b64_data = data.split(",", 1)
            else:
                b64_data = data
            frame_data = base64.b64decode(b64_data)
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"success": False, "error": "Invalid frame"})
                continue

            results = process_frame(frame)

            # Send results back
            await websocket.send_json({
                "success": True,
                "results": results,
                "timestamp": int(time.time()),
            })

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        print("uvicorn is not installed. Install with `pip install uvicorn` to run the server.")
        sys.exit(1)

    uvicorn.run(app, host="0.0.0.0", port=8000)
