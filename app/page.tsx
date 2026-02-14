'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ScanFace,
  Lock,
  ArrowRight,
  Fingerprint,
  Activity,
  Sparkles,
  Smartphone,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-neon-blue/20 blur-[120px]" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-neon-cyan/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),transparent_45%),linear-gradient(120deg,rgba(255,255,255,0.04)_0%,transparent_30%,transparent_70%,rgba(255,255,255,0.08)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-widest text-neon-blue backdrop-blur"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Zero-Trust Biometrics</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="space-y-4"
            >
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Proof of life, built for fast onboarding.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Verify real humans in under 10 seconds with gesture-driven liveness, anti-spoofing, and secure voice fallback. Designed for regulated teams that need confidence without friction.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/verify" className="group w-full sm:w-auto">
                <span className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue px-6 py-3 text-sm font-semibold text-black shadow-[0_10px_40px_rgba(79,209,255,0.35)] transition duration-200 ease-out hover:scale-[1.01]">
                  <ScanFace className="h-4 w-4" />
                  Start Verification
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
              <Link
                href="/voice"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 backdrop-blur transition hover:border-neon-blue/40 hover:bg-white/10 sm:w-auto"
              >
                <Smartphone className="h-4 w-4" />
                Voice Mode Demo
              </Link>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-6 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:w-auto">
                <Lock className="h-4 w-4" />
                Security brief
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="grid gap-3 sm:grid-cols-3"
            >
              {[{
                label: 'Median pass time',
                value: '8.4s',
              }, {
                label: 'Spoof attempts caught',
                value: '99.2%',
              }, {
                label: 'Regions supported',
                value: '42',
              }].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-neon-blue/20 via-transparent to-neon-cyan/25 blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live session</p>
                    <p className="text-sm font-semibold">Gesture + voice liveness</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/80">01:26</span>
              </div>

              <div className="space-y-6 px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[{
                    title: 'Camera ready',
                    icon: Sparkles,
                    tone: 'text-neon-blue',
                    bg: 'bg-neon-blue/10',
                  }, {
                    title: 'Signal strong',
                    icon: Activity,
                    tone: 'text-green-300',
                    bg: 'bg-green-400/10',
                  }].map((item) => (
                    <div
                      key={item.title}
                      className={`flex items-center gap-3 rounded-2xl ${item.bg} border border-white/5 px-3 py-3 text-sm`}
                    >
                      <item.icon className={`h-4 w-4 ${item.tone}`} />
                      <span className="font-medium">{item.title}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Depth + IR</span>
                    <span>Anti-spoof active</span>
                  </div>
                  <div className="mt-3 h-40 rounded-xl bg-[radial-gradient(circle_at_20%_20%,rgba(79,209,255,0.25),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(165,243,252,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.2))] border border-white/5" />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[{
                    title: 'Blink + turn',
                    desc: 'Tracking 62 key points',
                    icon: Fingerprint,
                  }, {
                    title: 'Unique phrase',
                    desc: 'Dynamic challenge',
                    icon: Lock,
                  }, {
                    title: 'Tamper proof',
                    desc: 'Signed attestation',
                    icon: ShieldCheck,
                  }].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="mb-2 flex items-center gap-2 text-neon-blue">
                        <item.icon className="h-4 w-4" />
                        <span className="font-semibold text-foreground">{item.title}</span>
                      </div>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 2 of 3</p>
                    <p className="text-sm font-semibold">Say the prompted phrase to finish</p>
                  </div>
                  <div className="flex w-full items-center gap-3 sm:w-auto">
                    <div className="h-2 flex-1 rounded-full bg-white/10">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-neon-blue to-neon-cyan" />
                    </div>
                    <span className="text-xs text-muted-foreground">68%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 space-y-6 lg:mt-24"
        >
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Why teams switch</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Security that still feels fast</h2>
            </div>
            <Link
              href="/docs"
              className="text-sm font-semibold text-neon-blue transition hover:text-neon-cyan"
            >
              View integration guide →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[{
              title: 'Active liveness',
              desc: 'Randomized gestures, blink checks, and depth mapping stop replay attacks before they start.',
              icon: Fingerprint,
            }, {
              title: 'Voice fallback',
              desc: 'Phone-first customers can verify with a short spoken phrase that rotates per attempt.',
              icon: Smartphone,
            }, {
              title: 'Enterprise-grade',
              desc: 'SOC2-ready auditing, regional routing, and signed attestations for every session.',
              icon: ShieldCheck,
            }].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-neon-blue/40 hover:bg-white/10"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neon-blue/10 text-neon-blue">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
