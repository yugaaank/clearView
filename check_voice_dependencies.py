
try:
    import resemblyzer
    print("resemblyzer: OK")
except ImportError as e:
    print(f"resemblyzer: MISSING ({e})")

try:
    import librosa
    print("librosa: OK")
except ImportError as e:
    print(f"librosa: MISSING ({e})")

try:
    import torch
    print("torch: OK")
except ImportError as e:
    print(f"torch: MISSING ({e})")

try:
    import torchaudio
    print("torchaudio: OK")
except ImportError as e:
    print(f"torchaudio: MISSING ({e})")

try:
    import webrtcvad
    print("webrtcvad: OK")
except ImportError as e:
    print(f"webrtcvad: MISSING ({e})")
