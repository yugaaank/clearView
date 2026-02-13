'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';

interface CameraFeedProps {
    onStreamReady?: (stream: MediaStream) => void;
    className?: string;
}

export interface CameraFeedHandle {
    captureFrame: () => string | null;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(({ onStreamReady, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
        captureFrame: () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return null;

            if (!video.videoWidth || !video.videoHeight) {
                return null; // stream not ready
            }

            const context = canvas.getContext('2d');
            if (!context) return null;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
        }
    }));

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function startCamera() {
            try {
                // Check if mediaDevices exists (it's undefined in insecure contexts)
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Camera API not available. You might be using HTTP. Try https://<IP>:3001");
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    if (onStreamReady) onStreamReady(stream);
                }
                setError(null);
            } catch (err: any) {
                console.error("Error accessing camera:", err);
                let errorMessage = "Camera access denied or unavailable.";

                if (err.message) {
                    errorMessage = err.message;
                } else if (window.isSecureContext === false) {
                    errorMessage = "Camera requires HTTPS. Access https://<Your-IP>:3001";
                }

                setError(errorMessage);
            }
        }

        startCamera();

        return () => {
            // Cleanup stream
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onStreamReady]);

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-black ${className}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Error Message Overlay */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6 text-center">
                    <div className="space-y-2">
                        <div className="text-neon-red font-bold text-lg">Camera Error</div>
                        <p className="text-white/70 text-sm">{error}</p>
                        <p className="text-xs text-white/40 mt-2">
                            Try using 'localhost' or ensure HTTPS is enabled.
                        </p>
                    </div>
                </div>
            )}

            {/* Scanline Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: "4px 4px, 100% 100%" }} />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/50" />
        </div>
    );
});

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
