from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import time
import uvicorn
import os

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChallengeResponse(BaseModel):
    challenge_id: str
    gesture: str
    instruction: str

class ValidateResponse(BaseModel):
    success: bool
    message: str
    token: str | None = None
    results: dict | None = None
    timestamp: float

GESTURES = [
    {"gesture": "blink", "instruction": "Blink your eyes twice"},
    {"gesture": "smile", "instruction": "Smile for the camera"},
    {"gesture": "turn_left", "instruction": "Turn your head slightly to the left"},
    {"gesture": "turn_right", "instruction": "Turn your head slightly to the right"},
    {"gesture": "nod", "instruction": "Nod your head"},
]

@app.post("/api/challenge", response_model=ChallengeResponse)
async def create_challenge():
    """Generates a random gesture challenge."""
    time.sleep(0.5)
    challenge = random.choice(GESTURES)
    challenge_id = f"chal_{int(time.time())}_{random.randint(1000, 9999)}"
    
    return {
        "challenge_id": challenge_id,
        "gesture": challenge["gesture"],
        "instruction": challenge["instruction"]
    }

def validate_frame(image_bytes: bytes) -> dict:
    """
    Exposed function to validate a frame.
    In a real implementation, this would send the bytes to the CV model.
    """
    # Simulate processing
    time.sleep(1.0)
    
    # Mock result logic
    is_success = random.random() < 0.8
    timestamp = time.time()
    
    if is_success:
        return {
            "success": True,
            "message": "Verification successful. Identity confirmed.",
            "token": f"auth_token_{int(timestamp)}",
            "results": {"confidence": 0.98, "liveness": True},
            "timestamp": timestamp
        }
    else:
        return {
            "success": False,
            "message": "Verification failed. Gesture not recognized.",
            "token": None,
            "results": {"confidence": 0.45, "liveness": False},
            "timestamp": timestamp
        }

@app.post("/api/validate", response_model=ValidateResponse)
async def validate_challenge_endpoint(
    challenge_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Validates the user's response to the challenge via File Upload.
    """
    try:
        # Read file bytes
        image_bytes = await file.read()
        
        # Use the exposed validation function
        result = validate_frame(image_bytes)
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Server error: {str(e)}",
            "token": None,
            "results": {},
            "timestamp": time.time()
        }

if __name__ == "__main__":
    print("Starting Proof-of-Life Backend (Multipart Support)...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
