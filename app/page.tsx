'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, ScanFace, Lock, ArrowRight, Fingerprint } from 'lucide-react';
// Button import removed as we use custom buttons
// Wait, I haven't added button component from shadcn yet. I will use standard HTML button or simple custom one if shadcn is missing.
// Actually, `npx shadcn@latest init` installs `lib/utils` but doesn't add components unless `shadcn add` is run.
// I should use standard Tailwind classes or my own Button component.
// I'll stick to standard Tailwind for simplicity and speed.

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background text-foreground">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="z-10 container mx-auto px-4 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-blue/30 bg-neon-blue/10 text-neon-blue mb-8 backdrop-blur-md"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-mono uppercase tracking-widest">Secure Bio-Auth System</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/50"
        >
          Proof of <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">Life</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          Next-generation biometric verification using AI-powered gesture recognition and liveness detection.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/verify">
            <button className="group relative px-8 py-4 bg-white text-black font-bold rounded-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-blue opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <div className="flex items-center gap-2 relative z-10">
                <ScanFace className="w-5 h-5" />
                <span>START VERIFICATION</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </Link>

          <button className="px-8 py-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-medium text-white/80 flex items-center gap-2 backdrop-blur-sm">
            <Lock className="w-4 h-4" />
            <span>Learn More</span>
          </button>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left"
        >
          {[
            { title: "Liveness Detection", icon: Fingerprint, desc: "Real-time gesture analysis ensures physical presence." },
            { title: "AI Powered", icon: ScanFace, desc: "Advanced computer vision algorithms for face tracking." },
            { title: "Bank-Grade Security", icon: ShieldCheck, desc: "End-to-end encryption and secure tokenization." }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-neon-blue/50 transition-colors backdrop-blur-sm group">
              <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-neon-blue">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
