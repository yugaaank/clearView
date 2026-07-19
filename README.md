<div align="center">

# 🛡️ clearView

**Liveness & deepfake-aware verification — a Next.js app with on-device anti-spoofing.**

[![Stack](https://img.shields.io/badge/stack-Next.js%2016-8b5cf6?style=for-the-badge)](https://nextjs.org)
[![ML](https://img.shields.io/badge/ml-anti--spoofing%20%2B%20resemblyzer-8b5cf6?style=for-the-badge)](#)
[![PRs](https://img.shields.io/badge/PRs-welcome-8b5cf6?style=for-the-badge)](#contributing)

</div>

---

<div align="center">

| | |
|---|---|
| 🎯 **Purpose** | Face liveness / deepfake detection UI |
| 🧩 **Stack** | Next.js 16 · TypeScript · Python ML helpers |
| 🌑 **Theme** | Dark / rich |
| 📦 **Status** | In development |

</div>

---

## ✨ Features

- 🧠 **Anti-spoofing** — Silent-Face-Anti-Spoofing model bundled
- 🔊 **Voice check** — Resemblyzer speaker embeddings
- 🧪 **Test harness** — `test_deepfake.sh` + sample audio (`noise.wav`, `silence.wav`, `monotonic.wav`)
- 🎨 Next.js 16 + `framer-motion` + `lucide-react` UI

## 🚀 Quick start

```bash
npm install
npm run dev
./test_deepfake.sh   # exercise the pipeline
```

## 📁 Structure

```
clearView/
├── app/  components/  hooks/  lib/  public/
├── python/            # ML scripts
├── Silent-Face-Anti-Spoofing-master/
├── Resemblyzer/
└── test_deepfake.sh
```

## 🤝 Contributing

PRs welcome — match the dark/rich README style.

## 📜 License

MIT © Yugank Rathore
