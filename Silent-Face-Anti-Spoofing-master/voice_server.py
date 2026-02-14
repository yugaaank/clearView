"""
Thin proxy to reuse the main FastAPI app defined in ../python/server.py.
Run with: uvicorn voice_server:app --host 0.0.0.0 --port 8000 --reload
"""
import sys
from pathlib import Path

# Point Python at the shared backend code in ../python
ROOT = Path(__file__).resolve().parents[1] / "python"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Re-export the FastAPI app
from server import app  # noqa: E402,F401

