'use client';

import { motion } from 'framer-motion';

interface FaceOverlayProps {
    status: 'idle' | 'scanning' | 'success' | 'fail';
}

export default function FaceOverlay({ status }: FaceOverlayProps) {
    const isScanning = status === 'scanning';
    const isSuccess = status === 'success';
    const isFail = status === 'fail';

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Face Guide Oval */}
            <div className="relative w-64 h-80 sm:w-72 sm:h-96">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 120">
                    <defs>
                        <linearGradient id="scan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--neon-blue)" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Static Frame Corners */}
                    <path d="M10,30 L10,10 L30,10" fill="none" stroke="var(--neon-blue)" strokeWidth="1" />
                    <path d="M70,10 L90,10 L90,30" fill="none" stroke="var(--neon-blue)" strokeWidth="1" />
                    <path d="M90,90 L90,110 L70,110" fill="none" stroke="var(--neon-blue)" strokeWidth="1" />
                    <path d="M30,110 L10,110 L10,90" fill="none" stroke="var(--neon-blue)" strokeWidth="1" />

                    {/* Animated Oval */}
                    <motion.ellipse
                        cx="50" cy="60" rx="40" ry="50"
                        fill="none"
                        stroke={isSuccess ? "var(--neon-green)" : isFail ? "var(--neon-red)" : "url(#scan-gradient)"}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        animate={{
                            strokeDashoffset: [0, 20],
                            filter: isScanning ? ["url(#glow)", "none"] : "none"
                        }}
                        transition={{
                            strokeDashoffset: { duration: 1, repeat: Infinity, ease: "linear" },
                            filter: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
                        }}
                    />
                </svg>

                {/* Scanning Beam */}
                {isScanning && (
                    <motion.div
                        className="absolute top-0 left-0 w-full h-[2px] bg-neon-blue shadow-[0_0_15px_rgba(0,255,255,0.8)]"
                        initial={{ top: "10%" }}
                        animate={{ top: "90%" }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "linear"
                        }}
                    />
                )}

                {/* Status Text Overlay */}
                {isSuccess && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="bg-neon-green/20 border border-neon-green text-neon-green px-4 py-2 rounded-lg font-mono font-bold backdrop-blur-md">
                            VERIFIED
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Radar Circles Background (Subtle) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <motion.div
                    className="w-96 h-96 border border-neon-blue rounded-full"
                    animate={{ scale: [1, 1.1], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                    className="w-[500px] h-[500px] border border-neon-cyan rounded-full absolute"
                    animate={{ scale: [1, 1.1], opacity: [0.3, 0] }}
                    transition={{ duration: 2, delay: 1, repeat: Infinity }}
                />
            </div>
        </div>
    );
}
