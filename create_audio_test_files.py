import wave
import math
import struct
import random
import os

def write_wav(filename, samples, sr=16000):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        # Scale to int16
        data = [int(max(-32767, min(32767, s * 32767))) for s in samples]
        f.writeframes(struct.pack('<' + 'h'*len(data), *data))
    print(f"Created {filename}")

sr = 16000
duration = 2.0 # seconds

# 1. Monotonic Sine Wave (440Hz) - Should trigger "monotonic pitch"
t = [i/sr for i in range(int(duration*sr))]
sine_wave = [math.sin(2 * math.pi * 440 * x) for x in t]
write_wav("monotonic.wav", sine_wave, sr)

# 2. White Noise - Should trigger "high spectral flatness"
noise = [random.uniform(-0.5, 0.5) for _ in t]
write_wav("noise.wav", noise, sr)

# 3. Silence - Should be "too short" or just passed as real/spoof depending on logic
# specific logic says if < 0.5s it returns "too short". If 2s silence, librosa might load it as zeros.
silence = [0.0 for _ in t]
write_wav("silence.wav", silence, sr)
