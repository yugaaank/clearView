'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldCheck, ArrowRight, Copy, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const TOKEN_STORAGE_KEY = 'verified_session_token';
const TOKEN_TIME_KEY = 'verified_at';

export default function SuccessPage() {
    const [token, setToken] = useState<string | null>(null);
    const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
    const [state, setState] = useState<'checking' | 'verified' | 'failed'>('checking');

    // Pull token from sessionStorage; if absent mark as failed.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        const storedTime = sessionStorage.getItem(TOKEN_TIME_KEY);
        if (storedToken) {
            setToken(storedToken);
            setVerifiedAt(storedTime);
            setState('verified');
        } else {
            setState('failed');
        }
    }, []);

    // One-time token consumption: once viewed, purge storage so a refresh doesn't stay verified.
    useEffect(() => {
        if (state !== 'verified' || typeof window === 'undefined') return;
        const clear = () => {
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
            sessionStorage.removeItem(TOKEN_TIME_KEY);
        };
        clear();
        return clear;
    }, [state]);

    // Celebrate only when truly verified.
    useEffect(() => {
        if (state !== 'verified') return;
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#00f0ff', '#bd00ff', '#00ff94']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#00f0ff', '#bd00ff', '#00ff94']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    }, [state]);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white relative overflow-hidden p-4">
            {/* Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[500px] h-[500px] bg-neon-green/10 rounded-full blur-[100px] animate-pulse" />
            </div>

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="z-10 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl max-w-md w-full text-center shadow-2xl relative"
            >
                {state === 'verified' ? (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-black rounded-full border-4 border-neon-green flex items-center justify-center shadow-[0_0_20px_var(--neon-green)]">
                        <CheckCircle className="w-12 h-12 text-neon-green" />
                    </div>
                ) : (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-black rounded-full border-4 border-rose-400 flex items-center justify-center shadow-[0_0_20px_rgb(248,113,113)]">
                        <XCircle className="w-12 h-12 text-rose-300" />
                    </div>
                )}

                <div className="mt-10 space-y-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-emerald-400">
                            {state === 'verified' ? 'Identity Verified' : 'Verification Required'}
                        </h1>
                        <p className="text-gray-400">
                            {state === 'verified'
                                ? 'Proof-of-Life check passed successfully.'
                                : 'You must complete verification to obtain a token.'}
                        </p>
                    </motion.div>
                </div>

                {/* Digital ID Card Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 p-4 bg-black/40 rounded-xl border border-white/5 text-left relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-50">
                        {state === 'verified' ? (
                            <ShieldCheck className="w-16 h-16 text-white/5" />
                        ) : (
                            <XCircle className="w-16 h-16 text-white/5" />
                        )}
                    </div>

                    <div className="text-xs uppercase text-gray-500 mb-1 font-mono">Session Token</div>
                    {state === 'verified' && token ? (
                        <div className="flex items-center gap-2 bg-black/50 p-2 rounded border border-white/5">
                            <code className="text-neon-green font-mono text-sm truncate flex-1">
                                {token}
                            </code>
                            <button
                                className="text-gray-400 hover:text-white transition-colors"
                                onClick={() => navigator.clipboard.writeText(token)}
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-white/10 text-gray-400 text-sm">
                            Token unavailable. Complete verification to receive one.
                        </div>
                    )}

                    <div className="mt-4 flex justify-between items-end">
                        <div>
                            <div className="text-xs text-gray-500">Status</div>
                            {state === 'verified' ? (
                                <div className="text-sm font-bold text-white flex items-center gap-1">
                                    <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                                    Active
                                </div>
                            ) : (
                                <div className="text-sm font-bold text-rose-200 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-rose-300 rounded-full animate-pulse" />
                                    Not verified
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Timestamp</div>
                            <div className="text-sm font-mono text-gray-300">
                                {verifiedAt ? new Date(verifiedAt).toLocaleTimeString() : '--:--:--'}
                            </div>
                        </div>
                    </div>

                    {/* Holographic overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8"
                >
                    {state === 'verified' ? (
                        <Link href="/">
                            <button className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center justify-center gap-2">
                                <span>Return to Home</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    ) : (
                        <Link href="/verify">
                            <button className="w-full py-4 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-400 transition-colors shadow-lg flex items-center justify-center gap-2">
                                <span>Start Verification</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    )}
                </motion.div>
            </motion.div>
        </main>
    );
}
