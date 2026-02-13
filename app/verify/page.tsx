'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import CameraFeed, { CameraFeedHandle, FrameCapture } from '@/components/CameraFeed';
import CameraPermissionHandler from '@/components/CameraPermissionHandler';
import FaceOverlay from '@/components/FaceOverlay';
import ChallengeCard from '@/components/ChallengeCard';
import StatusIndicator from '@/components/StatusIndicator';
import ProgressTracker from '@/components/ProgressTracker';
import { api, ChallengeResponse, AnalyzeResponse } from '@/lib/api';
import { useVerificationProgress } from '@/hooks/useVerificationProgress';
import { analytics } from '@/lib/analytics';

export default function VerifyPage() {
    const router = useRouter();
    const cameraRef = useRef<CameraFeedHandle>(null);

    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'fail'>('idle');
    const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
    const [feedReady, setFeedReady] = useState(false);
    const [cameraAllowed, setCameraAllowed] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string>('');
    const [countdown, setCountdown] = useState<number | null>(null);
    const [quality, setQuality] = useState<{ center: boolean | null; size: boolean | null; light: boolean | null }>({
        center: null,
        size: null,
        light: null,
    });
    const { progress, updateFromAnalysis, startAttempt, decrementTime, setPhase } = useVerificationProgress();

    // Simulate initial connection
    useEffect(() => {
        const timer = setTimeout(() => {
            setConnectionStatus('connected');
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Mirror countdown into progress tracker
    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            decrementTime();
        }
    }, [countdown, decrementTime]);

    const startVerification = async () => {
        let timerId: number | null = null;

        try {
            setProcessing(true);
            setStatus('scanning');
            setMessage('Fetching remote challenge...');
            setQuality({ center: null, size: null, light: null });
            setPhase('scanning');
            startAttempt(1);

            const chal = await api.getChallenge();
            setChallenge(chal);
            setCountdown(60);
            analytics.startSession(chal.challenge_id);
            analytics.track('verification_started', { challenge: chal.challenge_id });

            // countdown timer for 60s challenge expiry
            const start = Date.now();
            timerId = window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - start) / 1000);
                const remaining = 60 - elapsed;
                setCountdown(Math.max(remaining, 0));
                if (remaining <= 0 && timerId) {
                    clearInterval(timerId);
                }
            }, 1000);

            await captureUntilValid(chal);
        } catch (err) {
            console.error(err);
            setConnectionStatus('error');
            setProcessing(false);
            setMessage('Failed to connect to secure server.');
        } finally {
            if (timerId) clearInterval(timerId);
            timerId = null;
        }
    };

    const captureUntilValid = async (chal: ChallengeResponse) => {
        if (!cameraRef.current) return;

        const maxAttempts = 40;
        const intervalMs = 600;
        const minSamples = 10;   // minimum frames to average
        const maxSamples = 15;   // cap to avoid long waits
        const samples: { confidence: number; capture: FrameCapture }[] = [];
        let bestCapture: { confidence: number; capture: FrameCapture } | null = null;
        let streak = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const capture = cameraRef.current.captureFrame();
            if (!capture) {
                setStatus('scanning');
                setMessage('Camera warming up... hold steady.');
                await new Promise(res => setTimeout(res, 400));
                continue;
            }

            try {
                const live = await api.analyzeFrame(capture.dataUrl);
                const quality = evaluateFaceQuality(live, capture);
                setQuality({ center: quality.centerOk, size: quality.sizeOk, light: quality.lightOk });

                // Feed progress tracker
                const analysisPayload = {
                    quality_passed: quality.ok,
                    checks: {
                        liveness: { passed: live.label === 'real' && live.passed !== false, confidence: live.confidence, score: live.confidence },
                        face_detection: { passed: !!live.bbox, bbox: live.bbox ? [live.bbox.x, live.bbox.y, live.bbox.w, live.bbox.h] : [], area_pct: quality.coverage * 100 },
                        positioning: { passed: !!quality.centerOk, center_offset_x: quality.offsetX, center_offset_y: quality.offsetY },
                        image_quality: { passed: !!quality.lightOk, brightness: capture.brightness, blur: 0, contrast: 0 },
                        gesture_ready: { passed: quality.ok, baseline_set: quality.ok },
                    },
                    hints: quality.ok ? [] : [quality.reason],
                    ready_for_validation: quality.ok,
                };
                // @ts-expect-error minimal shape for hook
                updateFromAnalysis(analysisPayload);

                if (!quality.ok) {
                    // Break streak and reset accumulated samples if quality drops
                    if (samples.length > 0 || streak > 0) {
                        samples.length = 0;
                        bestCapture = null;
                        streak = 0;
                        setMessage(`Quality lost: ${quality.reason}. Restarting capture window.`);
                    } else {
                        setStatus('scanning');
                        setMessage(`${quality.reason} (${attempt}/${maxAttempts})`);
                    }
                } else {
                    // Collect good samples for averaging
                    streak += 1;
                    samples.push({ confidence: live.confidence, capture });
                    if (!bestCapture || live.confidence > bestCapture.confidence) {
                        bestCapture = { confidence: live.confidence, capture };
                    }

                    setStatus('scanning');
                    setMessage(`Quality OK ${samples.length}/${minSamples} (avg ${(
                        samples.reduce((a, b) => a + b.confidence, 0) / samples.length
                    ).toFixed(3)})`);

                    // Once we have enough samples (or hit cap), submit using best frame
                    if (samples.length >= minSamples || samples.length >= maxSamples) {
                        const avgConfidence = samples.reduce((a, b) => a + b.confidence, 0) / samples.length;
                        setMessage(`Submitting after ${samples.length} samples (avg ${avgConfidence.toFixed(3)})...`);
                        const frameToSend = bestCapture?.capture ?? capture;
                        const result = await api.validateChallenge(chal.challenge_id, chal.gesture, frameToSend.dataUrl);
                        if (result.success) {
                            setStatus('success');
                            setMessage('Identity Verified.');
                            setProcessing(false);
                            setCountdown(null);
                            setTimeout(() => router.push('/success'), 1200);
                            return;
                        } else {
                            setStatus('fail');
                            setProcessing(false);
                            setMessage(result.message || 'Verification failed.');
                            setTimeout(() => {
                                setStatus('idle');
                                setChallenge(null);
                                setMessage('');
                                setCountdown(null);
                                setQuality({ center: null, size: null, light: null });
                            }, 2000);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setStatus('fail');
                setMessage('Validation error. Retrying...');
            }

            await new Promise(res => setTimeout(res, intervalMs));
        }

        setStatus('fail');
        setProcessing(false);
        setMessage('Verification timeout. Try again.');
        setTimeout(() => {
            setStatus('idle');
            setChallenge(null);
            setMessage('');
            setCountdown(null);
            setQuality({ center: null, size: null, light: null });
        }, 2000);
    };

    /**
     * Evaluate frame beyond streak counting: full face presence, reasonable size, centered, and liveness score.
     */
    const evaluateFaceQuality = (live: AnalyzeResponse, capture: FrameCapture) => {
        // Require backend liveness pass flag and reasonable confidence (loosened to reduce false negatives)
        const confidenceOk = live.label === 'real' && live.passed !== false && live.confidence >= 0.9;
        if (!confidenceOk) {
            return { ok: false, reason: `Liveness failed (${live.confidence?.toFixed?.(3) ?? '0'})`, centerOk: null, sizeOk: null, lightOk: null, coverage: 0, offsetX: 0, offsetY: 0 };
        }

        // Bounding box sanity
        const box = live.bbox;
        if (!box) {
            return { ok: false, reason: 'Face not detected. Move closer.', centerOk: false, sizeOk: false, lightOk: evaluateLighting(capture), coverage: 0, offsetX: 0, offsetY: 0 };
        }

        const minFaceCoverage = 0.08; // 8% of frame area (loosened for smaller framing)
        const coverage = (box.w * box.h) / (capture.width * capture.height);
        const sizeOk = coverage >= minFaceCoverage;

        // Position: keep face roughly centered
        const faceCenterX = box.x + box.w / 2;
        const faceCenterY = box.y + box.h / 2;
        const cx = capture.width / 2;
        const cy = capture.height / 2;
        const maxOffset = 0.35; // allow slight off-center framing
        const offsetX = Math.abs(faceCenterX - cx) / capture.width;
        const offsetY = Math.abs(faceCenterY - cy) / capture.height;
        const centerOk = offsetX <= maxOffset && offsetY <= maxOffset;

        const lightOk = evaluateLighting(capture);

        if (!sizeOk) {
            return { ok: false, reason: 'Move closer to fill the frame.', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }
        if (!centerOk) {
            return { ok: false, reason: 'Center your face in the frame.', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }
        if (!lightOk) {
            return { ok: false, reason: 'Improve lighting (too dark/bright).', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }

        return { ok: true, reason: 'Face quality sufficient', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
    };

    const evaluateLighting = (capture: FrameCapture) => {
        const brightness = capture.brightness;
        const min = 40;
        const max = 230;
        return brightness >= min && brightness <= max;
    };

    if (!cameraAllowed) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="w-full max-w-md">
                    <CameraPermissionHandler
                        onPermissionGranted={() => setCameraAllowed(true)}
                        onPermissionDenied={() => {
                            setCameraAllowed(false);
                            analytics.track('camera_permission_denied');
                        }}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
                <StatusIndicator status={connectionStatus} className="pointer-events-auto" />
            </header>

            {/* Main Camera View */}
            <div className="relative flex-1 w-full h-full">
                <CameraFeed
                    ref={cameraRef}
                    onStreamReady={() => setFeedReady(true)}
                    className="w-full h-full"
                />

                {/* Overlays */}
                <FaceOverlay status={status} />

                {/* UI Controls */}
                <div className="absolute inset-0 z-40 pointer-events-auto">
                    {/* Dark overlay when not active to focus user */}
                    {!feedReady && (
                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                            <div className="text-neon-blue animate-pulse font-mono">INITIALIZING OPTICS...</div>
                        </div>
                    )}

                    <ChallengeCard
                        instruction={challenge?.instruction}
                        gesture={challenge?.gesture}
                        isLoading={processing}
                        onStart={startVerification}
                        countdown={countdown}
                        quality={quality}
                    />

                    {status === 'scanning' && (
                        <div className="hidden md:block absolute bottom-8 right-4 w-80 max-w-[90vw]">
                            <ProgressTracker progress={progress} />
                        </div>
                    )}

                    {/* Status Message Toast */}
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-mono text-neon-blue"
                        >
                            {message}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Background Grid Pattern (Subtle) */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--neon-blue)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </main>
    );
}
