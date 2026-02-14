#!/bin/bash
pip install -r python/requirements.txt
# Check if resemblyzer installed successfully (it might need git)
if ! python3 -c "import resemblyzer" &> /dev/null; then
    echo "Resemblyzer not found. Installing from source..."
    pip install git+https://github.com/resemble-ai/Resemblyzer.git
fi
echo "Voice dependencies installed."
