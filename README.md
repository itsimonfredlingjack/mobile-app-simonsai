# Project Monolith - Simons AI Mobile App

React Native mobilapp för Simons AI med QWEN-integration.

## Features

- **Voice Input** - Prata med QWEN via Whisper transkribering
- **Text Chat** - Terminal-style chat interface
- **Real-time Streaming** - Se QWEN svara token för token
- **Visual Feedback** - Tydliga states för recording, processing, sending
- **GPU Status** - Real-time GPU telemetry från servern

## Tech Stack

- **Expo SDK 52** - React Native framework
- **WebSocket** - Real-time kommunikation med backend
- **Whisper** - Voice-to-text transkribering (server-side)
- **Ollama + QWEN** - AI-modell för svar

## Installation

```bash
npm install
```

## Development

```bash
npx expo start
```

## Build APK

```bash
cd android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
ANDROID_HOME=/path/to/android-sdk \
./gradlew assembleRelease
```

APK finns i: `android/app/build/outputs/apk/release/app-release.apk`

## Konfiguration

Ändra server-IP i `src/constants/config.ts`:

```typescript
export const CONFIG = {
  BACKEND_URL: 'http://YOUR_IP:8000',
  WEBSOCKET_URL: 'ws://YOUR_IP:8000/api/chat',
  WHISPER_URL: 'http://YOUR_IP:8001',
  PROFILE: 'qwen',
};
```

## Version History

- **v1.6.2** - Voice feedback med visuell status
- **v1.6** - Antigravity protocol fix, text fungerar
- **v1.5** - WebSocket reconnect loop fix
- **v1.3** - Android cleartext traffic fix
- **v1.2** - Layout fix, chat i fokus
- **v1.1** - Safe area fix för Samsung S24
- **v1.0** - Initial release

## Backend Requirements

- Simons AI Backend på port 8000
- Whisper Server på port 8001 (CPU mode)
- Ollama med QWEN-modell

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
