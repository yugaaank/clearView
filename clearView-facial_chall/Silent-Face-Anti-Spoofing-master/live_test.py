"""
Stream webcam frames to the Silent Face Anti-Spoofing API for quick live testing.

Usage (from repo root, with venv active):
    python live_test.py --url http://localhost:8000/analyze --cam 0 --send-every 3 --threshold 0.93

Press ESC to exit.
"""

import argparse
import os
import sys
import time
from typing import Optional

# Force Qt to use X11 even if system defaults to Wayland
os.environ["QT_QPA_PLATFORM"] = "xcb"

import cv2
import requests


def parse_args():
    parser = argparse.ArgumentParser(description="Live webcam tester for /analyze endpoint")
    parser.add_argument("--url", default="http://localhost:8000/analyze", help="API endpoint")
    parser.add_argument("--cam", type=int, default=0, help="Webcam index")
    parser.add_argument(
        "--send-every",
        type=int,
        default=3,
        help="Send every Nth frame to reduce load (>=1)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.93,
        help="Confidence threshold for passing as real",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=0,
        help="Optional capture width (0 keeps camera default)",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=0,
        help="Optional capture height (0 keeps camera default)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if args.send_every < 1:
        print("--send-every must be >= 1")
        sys.exit(1)

    cap = cv2.VideoCapture(args.cam)
    if args.width:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    if args.height:
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)

    if not cap.isOpened():
        print(f"Could not open camera index {args.cam}")
        sys.exit(1)

    frame_id = 0
    last_result: Optional[str] = None
    last_color = (0, 255, 0)
    last_time = 0.0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Failed to read frame")
                break

            if frame_id % args.send_every == 0:
                ret, buf = cv2.imencode(".jpg", frame)
                if not ret:
                    print("Failed to encode frame")
                    break

                files = {"file": ("frame.jpg", buf.tobytes(), "image/jpeg")}
                try:
                    t0 = time.time()
                    resp = requests.post(args.url, files=files, timeout=10)
                    latency = (time.time() - t0) * 1000
                    data = resp.json()
                    if not resp.ok or not data.get("success", False):
                        raise RuntimeError(f"API error: {data}")

                    label = data.get("label", "unknown")
                    conf = data.get("confidence", 0.0)
                    last_result = f"{label} ({conf:.3f}) {latency:.0f} ms"
                    last_color = (0, 255, 0) if label == "real" and conf >= args.threshold else (0, 0, 255)
                    last_time = latency
                except Exception as exc:
                    last_result = f"error: {exc}"
                    last_color = (0, 0, 255)

            if last_result:
                cv2.putText(
                    frame,
                    last_result,
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    last_color,
                    2,
                    cv2.LINE_AA,
                )

            cv2.imshow("Anti-Spoof Live", frame)
            frame_id += 1

            # ESC key to exit
            if cv2.waitKey(1) & 0xFF == 27:
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
