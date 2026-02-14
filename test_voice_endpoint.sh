#!/bin/bash
# Create a dummy wav file
echo "data" > test_audio.wav

echo "Testing /api/voice-verify with field 'file'..."
curl -X POST "http://localhost:8000/api/voice-verify" \
  -F "file=@test_audio.wav" \
  -v

echo -e "\n\nTesting /api/voice-verify with field 'audio' (expect failure)..."
curl -X POST "http://localhost:8000/api/voice-verify" \
  -F "audio=@test_audio.wav" \
  -v

rm test_audio.wav
