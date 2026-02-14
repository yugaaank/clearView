'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Timer, MapPin, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const TOKEN_STORAGE_KEY = 'verified_session_token';
const TOKEN_TIME_KEY = 'verified_at';

const hashToken = (token: string) => {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
};

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const storedTime = sessionStorage.getItem(TOKEN_TIME_KEY);
    if (!storedToken) {
      router.replace('/verify');
      return;
    }
    setToken(storedToken);
    setVerifiedAt(storedTime);
  }, [router]);

  const placeholder = useMemo(() => {
    if (!token) return null;
    const h = hashToken(token);
    const risk = (h % 7) + 1; // 1-7%
    const latency = 180 + (h % 90); // 180-269 ms
    const gestures = 3 + (h % 4); // 3-6 gestures
    const region = ['us-east', 'us-west', 'eu-central', 'ap-southeast'][h % 4];
    return { risk, latency, gestures, region };
  }, [token]);

  const endSession = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_TIME_KEY);
    }
    router.push('/');
  };

  const shortToken = token ? `${token.slice(0, 10)}…${token.slice(-6)}` : 'loading…';

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-neon-blue/20 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-neon-cyan/15 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live session</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Biometric Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Each dashboard is tied to a unique session token.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/verify" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
              <RefreshCw className="h-4 w-4" />
              New verification
            </Link>
            <button
              onClick={endSession}
              className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-gray-200"
            >
              End session
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Session ID</p>
            <p className="font-mono text-sm truncate">{shortToken}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="h-4 w-4" />
              {verifiedAt ? `Started ${new Date(verifiedAt).toLocaleTimeString()}` : 'Pending'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Spoof risk</p>
            <div className="flex items-center gap-2 text-lg font-semibold text-emerald-300">
              <CheckCircle className="h-5 w-5" />
              {placeholder ? `${placeholder.risk}%` : '…'}
            </div>
            <p className="text-xs text-gray-400">Derived from session heuristics.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Edge latency</p>
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <Timer className="h-5 w-5 text-neon-blue" />
              {placeholder ? `${placeholder.latency} ms` : '…'}
            </div>
            <p className="text-xs text-gray-400">Camera → decision roundtrip.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Region route</p>
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <MapPin className="h-5 w-5 text-neon-cyan" />
              {placeholder ? placeholder.region : '…'}
            </div>
            <p className="text-xs text-gray-400">Geo-aware edge selection.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-neon-blue" />
              Gesture coverage
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-cyan"
                style={{ width: placeholder ? `${Math.min(100, placeholder.gestures * 18)}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {placeholder ? `${placeholder.gestures} gesture prompts completed.` : 'Loading…'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Audit trail
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Token bound to this session only.</li>
              <li>Placeholder events generated per token hash.</li>
              <li>Replace with real API data when ready.</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
