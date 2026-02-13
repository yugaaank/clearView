'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import CameraFeed, { CameraFeedHandle } from '@/components/CameraFeed';
import FaceOverlay from '@/components/FaceOverlay';
import ChallengeCard from '@/components/ChallengeCard';
import StatusIndicator from '@/components/StatusIndicator';
import { api, ChallengeResponse } from '@/lib/api';

export default function VerifyPage() {
    const router = useRouter();
    const cameraRef = useRef<CameraFeedHandle>(null);

    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'fail'>('idle');
    const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
    const [feedReady, setFeedReady] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string>('');

    // Simulate initial connection
    useEffect(() => {
        const timer = setTimeout(() => {
            setConnectionStatus('connected');
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const startVerification = async () => {
        try {
            setProcessing(true);
            setStatus('scanning');
            setMessage('Fetching remote challenge...');

            const chal = await api.getChallenge();
            setChallenge(chal);

            await captureUntilValid(chal);
        } catch (err) {
            console.error(err);
            setConnectionStatus('error');
            setProcessing(false);
            setMessage('Failed to connect to secure server.');
        }
    };

    const captureUntilValid = async (chal: ChallengeResponse) => {
        if (!cameraRef.current) return;

        const maxAttempts = 25;
        const intervalMs = 600;
        let streak = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const imageData = cameraRef.current.captureFrame();
            if (!imageData) {
                setStatus('scanning');
                setMessage('Camera warming up... hold steady.');
                await new Promise(res => setTimeout(res, 400));
                continue;
            }

            try {
                const live = await api.analyzeFrame(imageData);
                const spoofed = live.label !== 'real' || (live.passed === false) || live.confidence < 0.98;

                if (spoofed) {
                    streak = 0;
                    setStatus('scanning');
                    setMessage(`Liveness failed. Adjust face/lighting. (${attempt}/${maxAttempts})`);
                } else {
                    streak += 1;
                    setStatus('scanning');
                    setMessage(`Liveness ok (${live.confidence.toFixed(3)}). Hold... (${streak}/3)`);
                }

                if (streak >= 3) {
                    const result = await api.validateChallenge(chal.challenge_id, chal.gesture, imageData);
                    if (result.success) {
                        setStatus('success');
                        setMessage('Identity Verified.');
                        setProcessing(false);
                        setTimeout(() => router.push('/success'), 1200);
                        return;
                    } else {
                        setStatus('fail');
                        setMessage(result.message || 'Verification failed.');
                        setTimeout(() => {
                            setStatus('idle');
                            setChallenge(null);
                            setMessage('');
                        }, 2000);
                        return;
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
        }, 2000);
    };

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
                    />

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
