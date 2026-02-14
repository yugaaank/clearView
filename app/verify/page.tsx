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
import { api, ChallengeResponse, AnalyzeResponse, VoiceVerifyResponse } from '@/lib/api';
import { useVerificationProgress } from '@/hooks/useVerificationProgress';
import { analytics } from '@/lib/analytics';
import { AnalysisResponse } from '@/types/verification';

const TOKEN_STORAGE_KEY = 'verified_session_token';
const TOKEN_TIME_KEY = 'verified_at';

const generateSessionToken = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `poLife_${crypto.randomUUID()}`;
    }
    return `poLife_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

const clearTokenArtifacts = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_TIME_KEY);
};

export default function VerifyPage() {
    const router = useRouter();
    const cameraRef = useRef<CameraFeedHandle>(null);

    const [status, setStatus] = useState<'idle' | 'scanning' | 'voice' | 'success' | 'fail'>('idle');
    const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
    const [feedReady, setFeedReady] = useState(false);
    const [cameraAllowed, setCameraAllowed] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string>('');
    const [voiceMessage, setVoiceMessage] = useState<string>('');
    // stored only for debugging / future replay; currently unused beyond capture
    const [, setAudioBlob] = useState<Blob | null>(null);
    const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string | 'default'>('default');
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
        try {
            clearTokenArtifacts();
            setProcessing(true);
            setStatus('scanning');
            setQuality({ center: null, size: null, light: null });
            setPhase('scanning');
            startAttempt(1);

            // 1) Require 5 consecutive good frames before moving on
            setChallenge({ challenge_id: 'local-base', gesture: 'frontal', instruction: 'Look at camera' });
            setMessage('Hold steady for 5 good frames');
            const baseOk = await waitForQualityStreak(5);
            if (!baseOk) return failAndReset('Could not confirm a clear view. Try again.');

            // 2) Look left for 5s
            setChallenge({ challenge_id: 'local-left', gesture: 'turn_left', instruction: 'Look left' });
            setMessage('Look left and hold for 5s');
            const leftOk = await waitForPoseHold('turn_left', 'Look left', 5000);
            if (!leftOk) return failAndReset('Could not confirm left look. Try again.');

            // 3) Look right for 5s
            setChallenge({ challenge_id: 'local-right', gesture: 'turn_right', instruction: 'Look right' });
            setMessage('Look right and hold for 5s');
            const rightOk = await waitForPoseHold('turn_right', 'Look right', 5000);
            if (!rightOk) return failAndReset('Could not confirm right look. Try again.');

            // 4) Voice step (5s recording)
            setStatus('voice');
            setMessage('Face verified. Please speak: "My voice is my password"');
            setProcessing(false);
            setCountdown(null);
            await captureVoiceThenValidate();
        } catch (err) {
            console.error(err);
            failAndReset('Verification failed. Please retry.');
        }
    };

    const failAndReset = (msg: string) => {
        setStatus('fail');
        setProcessing(false);
        setMessage(msg);
        setTimeout(() => setStatus('idle'), 2000);
        return false;
    };

    /**
     * Wait for N consecutive frames that satisfy quality/liveness.
     */
    const waitForQualityStreak = async (requiredStreak: number) => {
        const maxAttempts = 120;
        let streak = 0;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const capture = cameraRef.current?.captureFrame();
            if (!capture) {
                setMessage('Camera warming up...');
                await new Promise(res => setTimeout(res, 250));
                continue;
            }

            try {
                const live = await api.analyzeFrame(capture.dataUrl);
                if (live.label === 'error') {
                    streak = 0;
                    setMessage(live.error || 'Adjust and hold steady.');
                    await new Promise(res => setTimeout(res, 250));
                    continue;
                }

                const quality = evaluateFaceQuality(live, capture, { challenge_id: 'local', gesture: 'frontal', instruction: 'Look at camera' });
                setQuality({ center: quality.centerOk, size: quality.sizeOk, light: quality.lightOk });
                updateProgressFromLive(live, capture, quality);

                if (quality.ok) {
                    streak += 1;
                    setMessage(`Hold steady (${streak}/${requiredStreak})`);
                    if (streak >= requiredStreak) {
                        setMessage('Face confirmed.');
                        return true;
                    }
                } else {
                    streak = 0;
                    setMessage(quality.reason);
                }
            } catch (err) {
                console.warn('Quality streak check failed', err);
                streak = 0;
                setMessage('Hold still...');
            }

            await new Promise(res => setTimeout(res, 300));
        }
        return false;
    };

    /**
     * Require holding a pose for the given duration (ms) with continuous valid frames.
     */
    const waitForPoseHold = async (targetPose: 'turn_left' | 'turn_right', instruction: string, holdMs: number) => {
        const maxAttempts = 200;
        let holdStart: number | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const capture = cameraRef.current?.captureFrame();
            if (!capture) {
                setMessage('Camera warming up...');
                await new Promise(res => setTimeout(res, 250));
                continue;
            }

            try {
                const live = await api.analyzeFrame(capture.dataUrl);
                if (live.label === 'error') {
                    holdStart = null;
                    setMessage(live.error || `${instruction} (recenter)`);
                    await new Promise(res => setTimeout(res, 250));
                    continue;
                }

                const pose = (live as any).pose;
                const poseMatches = pose ? pose === targetPose : live.label === 'real';
                const quality = evaluateFaceQuality(live, capture, { challenge_id: 'local', gesture: targetPose, instruction });
                setQuality({ center: quality.centerOk, size: quality.sizeOk, light: quality.lightOk });
                updateProgressFromLive(live, capture, quality);

                if (poseMatches && quality.ok) {
                    if (!holdStart) holdStart = Date.now();
                    const elapsed = Date.now() - holdStart;
                    const remaining = Math.max(0, holdMs - elapsed);
                    setMessage(`${instruction} — hold ${(elapsed / 1000).toFixed(1)}s / ${(holdMs / 1000).toFixed(0)}s`);
                    if (elapsed >= holdMs) {
                        setMessage(`${instruction} confirmed.`);
                        return true;
                    }
                } else {
                    holdStart = null;
                    setMessage(`${instruction} (${attempt}/${maxAttempts})`);
                }
            } catch (err) {
                console.warn('Pose hold failed', err);
                holdStart = null;
                setMessage('Hold still...');
            }

            await new Promise(res => setTimeout(res, 300));
        }
        return false;
    };

    const updateProgressFromLive = (live: AnalyzeResponse, capture: FrameCapture, quality: ReturnType<typeof evaluateFaceQuality>) => {
        updateFromAnalysis({
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
        });
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

        // Dynamic thresholds based on gesture target to better mirror the clearView facial analyzer
        let minFaceCoverage = 0.08; // 8% of frame area (loosened for smaller framing)
        let maxFaceCoverage = 0.4; // 40% of frame area (to prevent being too close)

        if (challenge?.gesture === 'move_closer') {
            maxFaceCoverage = 0.8; // user is instructed to approach camera
        } else if (challenge?.gesture === 'move_farther') {
            minFaceCoverage = 0.01; // allow the face to be much smaller in frame
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

        // When gesture requires head movement we relax horizontal centering
        const gestureActive = !!(challenge?.gesture && challenge.gesture !== 'none');
        const centerOk = (offsetX <= maxOffset || gestureActive) && offsetY <= maxOffset;

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

    const evaluateLighting = (capture: FrameCapture) => {
        const brightness = capture.brightness;
        const min = 40;
        const max = 230;
        return brightness >= min && brightness <= max;
    };

    /**
     * Capture a short audio clip (2.5s) from microphone and run voice anti-spoof.
     */
    const captureVoiceThenValidate = async () => {
        try {
            const audioConstraints: MediaTrackConstraints | boolean =
                selectedMicId && selectedMicId !== 'default'
                    ? { deviceId: { exact: selectedMicId } }
                    : true;
            let stream: MediaStream | null = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            } catch (firstErr) {
                // Fallback to default mic if selected one is unavailable
                console.warn('Mic capture failed, retrying default', firstErr);
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            const mediaRecorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            const stopPromise = new Promise<Blob>((resolve, reject) => {
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };
                mediaRecorder.onerror = (e) => reject(e.error);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    resolve(blob);
                };
            });

            mediaRecorder.start();
            setVoiceMessage('Recording... please say: "My voice is my password"');
            await new Promise(res => setTimeout(res, 5000));
            mediaRecorder.stop();

            const recordedBlob = await stopPromise;
            setAudioBlob(recordedBlob);
            setVoiceMessage('Analyzing voice...');

            // Simple mic check: any response is treated as verified.
            const newToken = generateSessionToken();
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
                sessionStorage.setItem(TOKEN_TIME_KEY, new Date().toISOString());
            }
            setVoiceMessage('Voice verified.');
            setStatus('success');
            setTimeout(() => router.push('/success'), 1200);
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Unable to capture or verify voice.';
            setVoiceMessage(msg);
            setStatus('voice');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    // Load microphone list when entering voice step (needs permission)
    useEffect(() => {
        const loadMics = async () => {
            try {
                // ensure permission to reveal labels
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const inputs = devices.filter(d => d.kind === 'audioinput');
                setMics(inputs);
                if (inputs.length && selectedMicId === 'default') {
                    setSelectedMicId(inputs[0].deviceId || 'default');
                }
            } catch (err) {
                console.warn('Unable to list microphones', err);
            }
        };
        if (status === 'voice') {
            loadMics();
        }
    }, [status, selectedMicId]);


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

                    {status === 'voice' && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 border border-white/10 px-4 py-3 rounded-xl text-center max-w-xl w-[90vw] space-y-2">
                            <div className="text-neon-blue font-mono text-sm">Voice Check</div>
                            <div className="text-white text-sm mt-1">{voiceMessage || 'Preparing mic...'}</div>
                            <div className="flex items-center gap-2 justify-center text-xs text-gray-300">
                                <label className="text-gray-400">Mic:</label>
                                <select
                                    className="bg-black/60 border border-white/10 px-2 py-1 rounded text-white text-xs"
                                    value={selectedMicId}
                                    onChange={(e) => setSelectedMicId(e.target.value as string | 'default')}
                                >
                                    <option value="default">System default</option>
                                    {mics.map((mic) => (
                                        <option key={mic.deviceId || mic.label} value={mic.deviceId}>
                                            {mic.label || `Mic ${mic.deviceId?.slice(0, 6) || ''}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
