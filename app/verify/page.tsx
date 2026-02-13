'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
            setProcessing(false);

            // Auto-capture after delay (simulating user performing gesture)
            // In a real app, we might use face-api.js to detect the gesture live
            // For this demo, we'll give the user 4 seconds to perform it
            setTimeout(() => {
                captureAndValidate(chal.challenge_id);
            }, 4000);

        } catch (err) {
            console.error(err);
            setConnectionStatus('error');
            setProcessing(false);
            setMessage('Failed to connect to secure server.');
        }
    };

    const captureAndValidate = async (challengeId: string) => {
        if (!cameraRef.current) return;

        setProcessing(true);
        setMessage('Verifying biometric data...');

        // Capture frame
        const imageData = cameraRef.current.captureFrame();
        if (!imageData) {
            setStatus('fail');
            setProcessing(false);
            setMessage('Camera capture failed.');
            return;
        }

        try {
            const result = await api.validateChallenge(challengeId, imageData);

            if (result.success) {
                setStatus('success');
                setMessage('Identity Verified.');
                setTimeout(() => {
                    router.push('/success');
                }, 2000);
            } else {
                setStatus('fail');
                setMessage(result.message || 'Verification failed.');
                setTimeout(() => {
                    // Reset to retry
                    setStatus('idle');
                    setChallenge(null);
                    setMessage('');
                    setProcessing(false);
                }, 3000);
            }
        } catch (err) {
            console.error(err);
            setStatus('fail');
            setMessage('Validation error.');
            setTimeout(() => setStatus('idle'), 3000);
        }

        setProcessing(false);
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
