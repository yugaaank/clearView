#!/bin/bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/Resemblyzer

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed."
    exit 1
fi

echo "Checking voice dependencies..."

# Check for required python modules
MISSING_DEPS=0
python3 -c "import resemblyzer" 2>/dev/null || { echo "Missing: resemblyzer"; MISSING_DEPS=1; }
python3 -c "import librosa" 2>/dev/null || { echo "Missing: librosa"; MISSING_DEPS=1; }
python3 -c "import torch" 2>/dev/null || { echo "Missing: torch"; MISSING_DEPS=1; }
python3 -c "import torchaudio" 2>/dev/null || { echo "Missing: torchaudio"; MISSING_DEPS=1; }
python3 -c "import webrtcvad" 2>/dev/null || { echo "Missing: webrtcvad"; MISSING_DEPS=1; }

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo "Some dependencies are missing."
    echo "Please install them using: pip install -r python/requirements.txt"
    echo "Note: You might need to install 'git' to install resemblyzer from source if it's not on PyPI."
    # Optional: ask to install? For now, just warn.
    read -p "Attempt to run server anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "All dependencies look good!"
fi

echo "Starting server..."
# Using the python/server.py which has the voice endpoints
cd python
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
