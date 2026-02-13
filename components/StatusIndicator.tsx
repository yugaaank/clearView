'use client';

import { Activity, Wifi, Check, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
    status: 'connecting' | 'connected' | 'error';
    secure?: boolean;
    className?: string;
}

export default function StatusIndicator({ status, secure = true, className }: StatusIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-4 px-4 py-2 rounded-full glass-card bg-black/30 border border-white/5 backdrop-blur-sm", className)}>
            <div className="flex items-center gap-2">
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'connected' ? "bg-neon-green shadow-[0_0_8px_var(--neon-green)]" :
                        status === 'error' ? "bg-neon-red shadow-[0_0_8px_var(--neon-red)]" :
                            "bg-yellow-500 animate-pulse"
                )} />
                <span className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                    {status === 'connected' ? 'SYSTEM ONLINE' : status === 'error' ? 'CONNECTION LOST' : 'CONNECTING...'}
                </span>
            </div>

            <div className="h-4 w-px bg-white/10" />

            {secure && (
                <div className="flex items-center gap-1.5 text-neon-blue">
                    <Lock className="w-3 h-3" />
                    <span className="text-[10px] font-bold tracking-widest">SECURE</span>
                </div>
            )}

            <div className="ml-auto hidden sm:flex items-center gap-2 opacity-50">
                <Wifi className="w-3 h-3" />
                <span className="text-[10px]">5ms</span>
            </div>
        </div>
    );
}
