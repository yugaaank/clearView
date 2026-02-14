#!/bin/bash
# Generate test files
python3 create_audio_test_files.py

echo "---------------------------------------------------"
echo "Testing Monotonic Audio (Sine Wave) - Expecting 'spoof' (monotonic)"
curl -X POST "http://localhost:8000/api/voice-verify" -F "file=@monotonic.wav" -s | grep -o '"label":"[^"]*","score":[^,]*,"reason":"[^"]*"'

echo -e "\n---------------------------------------------------"
echo "Testing White Noise - Expecting 'spoof' (flatness)"
curl -X POST "http://localhost:8000/api/voice-verify" -F "file=@noise.wav" -s | grep -o '"label":"[^"]*","score":[^,]*,"reason":"[^"]*"'

echo -e "\n---------------------------------------------------"
echo "Testing Silence"
curl -X POST "http://localhost:8000/api/voice-verify" -F "file=@silence.wav" -s | grep -o '"label":"[^"]*","score":[^,]*,"reason":"[^"]*"'

# Cleanup
rm monotonic.wav noise.wav silence.wav
