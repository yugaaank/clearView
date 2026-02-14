'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
import { AnalysisResponse as TypeAnalysisResponse } from '@/types/verification';

export interface AnalysisResponse {
    label: string;
    confidence: number;
    passed?: boolean;
    pose?: string; // e.g., "frontal", "turn_left", "turn_right"
    bbox?: { x: number; y: number; w: number; h: number };
    error?: string;
}

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

    const evaluateLighting = (capture: FrameCapture) => {
        const brightness = capture.brightness;
        const min = 40;
        const max = 230;
        return brightness >= min && brightness <= max;
    };

    /**
     * Evaluate frame beyond streak counting: full face presence, reasonable size, centered, and liveness score.
     */
    const evaluateFaceQuality = (live: AnalyzeResponse, capture: FrameCapture, challenge?: ChallengeResponse | null) => {
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

        // Dynamic thresholds based on challenge
        let minFaceCoverage = 0.08;
        let maxFaceCoverage = 0.4;

        if (challenge?.gesture === 'move_closer') {
            maxFaceCoverage = 0.8; // Allow getting very close
        } else if (challenge?.gesture === 'move_farther') {
            minFaceCoverage = 0.01; // Allow getting very far
        }

        const coverage = (box.w * box.h) / (capture.width * capture.height);
        const sizeOk = coverage >= minFaceCoverage;
        const isTooClose = coverage > maxFaceCoverage;

        // Position: keep face roughly centered
        const faceCenterX = box.x + box.w / 2;
        const faceCenterY = box.y + box.h / 2;
        const cx = capture.width / 2;
        const cy = capture.height / 2;
        const maxOffset = 0.35; // allow slight off-center framing
        const offsetX = Math.abs(faceCenterX - cx) / capture.width;
        const offsetY = Math.abs(faceCenterY - cy) / capture.height;

        // RELAXATION: If we are doing a gesture challenge (turning head), we expect the face to move off-center horizontally.
        // We still check vertical centering.
        const isGestureActive = !!(challenge?.gesture && challenge.gesture !== 'none');
        const centerOk = (offsetX <= maxOffset || isGestureActive) && offsetY <= maxOffset;

        const lightOk = evaluateLighting(capture);

        if (isTooClose) {
            return { ok: false, reason: 'Move back, too close.', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }
        if (!sizeOk) {
            return { ok: false, reason: 'Move closer.', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }
        if (!centerOk) {
            return { ok: false, reason: 'Center your face.', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }
        if (!lightOk) {
            return { ok: false, reason: 'Adjust lighting.', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
        }

        return { ok: true, reason: 'Face quality sufficient', centerOk, sizeOk, lightOk, coverage, offsetX, offsetY };
    };

    const startVerification = async () => {
        let timerId: number | null = null;

        try {
            setProcessing(true);
            setStatus('scanning');
            setMessage('Fetching remote challenge...');
            setQuality({ center: null, size: null, light: null });
            setPhase('scanning');
            startAttempt(1);

            setCountdown(60);
            const start = Date.now();
            timerId = window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - start) / 1000);
                const remaining = 60 - elapsed;
                setCountdown(Math.max(remaining, 0));
                if (remaining <= 0 && timerId) {
                    clearInterval(timerId);
                }
            }, 1000);

            // Start (local) challenge logic
            // We don't necessarily need api.getChallenge if we use local sequence, 
            // but let's keep it clean.
            await captureUntilValid();
        } catch (err: any) {
            console.error("Verification Error:", err);
            setStatus('fail');
            setProcessing(false);

            // Show specific timeout message if available
            if (err.message === 'Challenge timed out') {
                setMessage('Timed out. Please move clearly to the side.');
            } else {
                setMessage(err.message || 'Verification failed. Try again.');
            }

            // Reset after delay
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
                setChallenge(null);
            }, 3000);
        } finally {
            if (timerId) clearInterval(timerId);
            timerId = null;
        }
    };

    const captureUntilValid = async () => {
        if (!cameraRef.current) return;

        // Sequence: Left -> Right -> Smile -> Red Dot
        const sequence = [
            { gesture: 'turn_left', instruction: 'Move Face to Left Side' },
            { gesture: 'turn_right', instruction: 'Move Face to Right Side' },
            { gesture: 'smile', instruction: 'Smile!' }
        ];

        for (const step of sequence) {
            setChallenge({ challenge_id: 'local', ...step });
            setMessage(step.instruction);
            // Ensure status is scanning for overlay visibility
            setStatus('scanning');

            try {
                if (step.gesture === 'follow_dot') {
                    await runDotChallenge();
                } else {
                    await captureSingleChallenge(step);
                }
            } catch (e) {
                // Propagate error to main handler to stop sequence
                throw e;
            }

            // Short pause between challenges
            setStatus('success');
            setMessage("Good!");
            await new Promise(res => setTimeout(res, 1000));
        }

        // Final submission
        const capture = cameraRef.current.captureFrame();
        if (capture) {
            const result = await api.validateChallenge('final', 'all', capture.dataUrl);
            if (result.success) {
                setStatus('success');
                setMessage('Identity Verified.');
                setProcessing(false);
                setCountdown(null);
                setTimeout(() => router.push('/success'), 1200);
            } else {
                throw new Error("Validation failed");
            }
        }
    };

    const runDotChallenge = async () => {
        // Dot Sequence: Center -> Left -> Right -> Center
        const dotSteps = [
            { x: '50%', y: '50%', pose: 'frontal', label: 'Center' },
            { x: '10%', y: '50%', pose: 'turn_right', label: 'Left Side' }, // Screen Left -> Move Right to follow? No. Screen Left -> Move to Screen Left.
            // Logic recap: cx < 0.45 is SCREEN LEFT. This corresponds to `turn_right` in backend.
            // So if Dot is at 10% (Left), we want user at Screen Left (turn_right). Correct.

            { x: '90%', y: '50%', pose: 'turn_left', label: 'Right Side' }, // Screen Right -> `turn_left`
            { x: '50%', y: '50%', pose: 'frontal', label: 'Center' },
        ];

        for (const dot of dotSteps) {
            setDotPosition({ x: dot.x, y: dot.y });
            setMessage(`Follow Dot: ${dot.label}`);

            // Allow time for user to move
            await new Promise(res => setTimeout(res, 800));

            try {
                // We'll require 1 good frame to pass each dot step
                const subTarget = { gesture: dot.pose, instruction: `Follow Dot: ${dot.label}` };
                await captureSingleChallenge(subTarget, 1); // We need to update captureSingleChallenge to accept minSamples override
            } catch (e) {
                console.warn(`Dot step ${dot.label} failed, continuing...`);
            }
        }
        setDotPosition(null);
    };

    const captureSingleChallenge = async (target: { gesture: string, instruction: string }, overrideMinSamples?: number) => {
        const maxAttempts = 100;
        const intervalMs = 200;
        const minSamples = overrideMinSamples || 2; // Reduced to 2 for easier passing
        const samples: { confidence: number; capture: FrameCapture }[] = [];
        let streak = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (!cameraRef.current) break;
            const capture = cameraRef.current.captureFrame();
            if (!capture) {
                await new Promise(res => setTimeout(res, 200));
                continue;
            }

            try {
                const live = await api.analyzeFrame(capture.dataUrl);

                if (live.label === 'error') {
                    setMessage(live.error || 'Adjust face.');
                    await new Promise(res => setTimeout(res, 200));
                    continue;
                }

                // Evaluate Quality & Update Progress
                // Create a temporary challenge object for the evaluator
                const currentChallenge = { challenge_id: 'local', ...target };
                const quality = evaluateFaceQuality(live, capture, currentChallenge);
                setQuality({ center: quality.centerOk, size: quality.sizeOk, light: quality.lightOk });

                // Update Progress Tracker
                const analysisPayload: TypeAnalysisResponse = {
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
                updateFromAnalysis(analysisPayload);

                if (!quality.ok) {
                    // If quality fails (e.g. not centered vertically, too far, etc), reset streak
                    streak = 0;
                    samples.length = 0;
                    setMessage(`${quality.reason}`);
                } else {
                    // Check Gesture
                    const detectedPose = (live as any).pose || 'frontal';

                    if (detectedPose === target.gesture) {
                        streak++;
                        samples.push({ confidence: live.confidence, capture });
                        setMessage(`${target.instruction} (Hold... ${streak}/${minSamples})`);
                    } else {
                        streak = 0;
                        samples.length = 0;
                        const feedback = detectedPose === 'frontal' ? target.instruction : `Detected: ${detectedPose.replace('turn_', '')}`;
                        setMessage(`${target.instruction} (${feedback})`);
                    }
                }

                if (streak >= minSamples) {
                    return; // Challenge Passed
                }

            } catch (err) {
                console.error(err);
            }
            await new Promise(res => setTimeout(res, intervalMs));
        }
        throw new Error("Challenge timed out");
    };




    const handleStreamReady = useCallback(() => {
        setFeedReady(true);
    }, []);

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
                    onStreamReady={handleStreamReady}
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

                    {/* Debug Overlay */}
                    <div className="absolute top-2 left-2 text-xs text-green-400 font-mono bg-black/50 p-2 rounded">
                        <div>Status: {status}</div>
                        <div>Quality: {JSON.stringify(quality)}</div>
                        <div>Target: {challenge?.gesture}</div>
                        {/* We can't easily access 'live' here without state, but message often contains it */}
                    </div>
                </div>
            </div>

            {/* Background Grid Pattern (Subtle) */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--neon-blue)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </main >
    );
}
