'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldCheck, ArrowRight, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
    const [token, setToken] = useState('auth_token_placeholder');

    useEffect(() => {
        // Generate random token for demo
        setToken(`poLife_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`);

        // Trigger confetti
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
    }, []);

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
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-black rounded-full border-4 border-neon-green flex items-center justify-center shadow-[0_0_20px_var(--neon-green)]">
                    <CheckCircle className="w-12 h-12 text-neon-green" />
                </div>

                <div className="mt-10 space-y-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-emerald-400">
                            Identity Verified
                        </h1>
                        <p className="text-gray-400">Proof-of-Life check passed successfully.</p>
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
                        <ShieldCheck className="w-16 h-16 text-white/5" />
                    </div>

                    <div className="text-xs uppercase text-gray-500 mb-1 font-mono">Session Token</div>
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

                    <div className="mt-4 flex justify-between items-end">
                        <div>
                            <div className="text-xs text-gray-500">Status</div>
                            <div className="text-sm font-bold text-white flex items-center gap-1">
                                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                                Active
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">Timestamp</div>
                            <div className="text-sm font-mono text-gray-300">{new Date().toLocaleTimeString()}</div>
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
                    <Link href="/">
                        <button className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center justify-center gap-2">
                            <span>Return to Home</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </Link>
                </motion.div>
            </motion.div>
        </main>
    );
}
