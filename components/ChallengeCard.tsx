'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, CheckCircle, Smartphone, User, RefreshCw, XCircle } from 'lucide-react';

interface ChallengeCardProps {
    instruction?: string;
    gesture?: string;
    onStart?: () => void;
    isLoading?: boolean;
    countdown?: number | null;
    quality?: {
        center: boolean | null;
        size: boolean | null;
        light: boolean | null;
    };
}

export default function ChallengeCard({ instruction, gesture, onStart, isLoading, countdown, quality }: ChallengeCardProps) {
    const getIcon = (ges: string) => {
        switch (ges) {
            case 'smile': return <User className="w-8 h-8 text-neon-green" />;
            case 'blink': return <User className="w-8 h-8 text-neon-blue" />;
            case 'turn_left': return <User className="w-8 h-8 text-neon-purple" />;
            case 'turn_right': return <User className="w-8 h-8 text-neon-purple" />;
            case 'nod': return <User className="w-8 h-8 text-neon-blue" />;
            default: return <User className="w-8 h-8 text-muted-foreground" />;
        }
    };

    const renderIndicator = (label: string, value: boolean | null | undefined) => {
        const color = value === true ? 'text-neon-green border-neon-green/70' :
            value === false ? 'text-neon-red border-neon-red/70' :
                'text-gray-400 border-white/10';
        const dot = value === true ? 'bg-neon-green' : value === false ? 'bg-neon-red' : 'bg-gray-500';

        return (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono ${color}`}>
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span>{label}</span>
            </div>
        );
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={instruction || 'start'}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="absolute bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-96"
            >
                <div className="glass-card  rounded-xl p-6 border border-white/10 flex flex-col items-center text-center space-y-4 shadow-2xl backdrop-blur-xl bg-black/40">

                    {!instruction ? (
                        // Initial Start State
                        <>
                            <div className="w-12 h-12 rounded-full bg-neon-blue/20 flex items-center justify-center mb-2 animate-pulse">
                                <Smartphone className="w-6 h-6 text-neon-blue" />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-wider">IDENTITY VERIFICATION</h3>
                            <p className="text-sm text-gray-400">
                                Position your face in the oval and follow the gesture instructions.
                            </p>
                            <button
                                onClick={onStart}
                                disabled={isLoading}
                                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple font-bold text-white shadow-lg hover:shadow-neon-blue/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <PlayCircle className="w-5 h-5 group-hover:block hidden" />
                                        <span>BEGIN SCAN</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        // Challenge Active State
                        <>
                            <div className="w-full flex items-center justify-between text-xs uppercase tracking-[0.2em] text-neon-blue font-bold mb-1">
                                <span className="animate-pulse">ACTION REQUIRED</span>
                                {typeof countdown === 'number' && (
                                    <span className="text-white/70 font-mono normal-case tracking-tight bg-white/5 px-2 py-1 rounded-md border border-white/10">
                                        {Math.max(countdown, 0)}s
                                    </span>
                                )}
                            </div>
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                key={gesture}
                                className="mb-2"
                            >
                        {getIcon(gesture || '')}
                    </motion.div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {instruction}
                    </h2>
                    <div className="flex flex-wrap gap-2 justify-center w-full">
                        {renderIndicator('Center', quality?.center)}
                        {renderIndicator('Distance', quality?.size)}
                        {renderIndicator('Lighting', quality?.light)}
                    </div>
                    <div className="w-full bg-gray-800/50 h-1.5 rounded-full overflow-hidden mt-4">
                        <motion.div
                            className="h-full bg-neon-green shadow-[0_0_10px_var(--neon-green)]"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                                    transition={{ duration: 4, ease: "linear" }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
