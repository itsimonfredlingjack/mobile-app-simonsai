# Simons AI - Mobilapp

## Arkitektur

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   MOBILAPP      │─────▶│  WHISPER-SERVER  │─────▶│    BACKEND      │
│   (Android)     │      │  :8001           │      │    :8000        │
│                 │      │                  │      │                 │
│  Spelar in ljud │      │  Transkriberar   │      │  AI-agenter     │
│  Väljer agent   │      │  svenska (sv)    │      │  QWEN/NERDY     │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                   ┌───────────────┐
                                                   │ NERDY SERVER  │
                                                   │ 192.168.86.27 │
                                                   │ :11434        │
                                                   └───────────────┘
```

## IP-adresser och portar

| Tjänst | IP | Port | Ändra i fil |
|--------|-----|------|-------------|
| Backend API | 192.168.86.26 | 8000 | `App.tsx:20` |
| Whisper Server | 192.168.86.26 | 8001 | `App.tsx:21`, `whisper-server.py:32` |
| NERDY (extern Ollama) | 192.168.86.27 | 11434 | Backend routing |
| APK Download | 192.168.86.26 | 8888 | - |

## Kritiska filer

### Mobilapp (`/home/ai-server/simons-ai-app/`)
- `App.tsx` rad 20-21 - BACKEND_URL och WHISPER_URL
- `app.json` - App-namn och bundle ID

### Server (`/home/ai-server/`)
- `whisper-server.py` rad 32 - BACKEND_URL som Whisper skickar till

## Flöden

### Röstinmatning
1. Användare trycker mikrofon-knapp
2. Appen spelar in ljud (.m4a)
3. Skickar till Whisper: `POST :8001/voice-command` (audio + profile)
4. Whisper transkriberar → skickar till Backend: `POST :8000/api/voice-command`
5. Backend routar till rätt agent (QWEN lokal / NERDY extern)
6. Svar tillbaka hela vägen

### Textinmatning
1. Användare skriver text
2. Skickar direkt till Backend: `POST :8000/api/voice-command`
3. Svar tillbaka

## Felsökning

| Problem | Lösning |
|---------|---------|
| Appen ansluter inte | Kontrollera IP i `App.tsx` rad 20-21 |
| Röst transkriberas inte | Starta om whisper-server (se nedan) |
| NERDY svarar inte | Kolla att 192.168.86.27 är online |
| QWEN svarar istället för NERDY | Kontrollera att `profile` skickas i request |

## Kommandon

### Starta om Whisper-server
```bash
pkill -f whisper-server.py
cd /home/ai-server
/home/ai-server/whisper-venv/bin/python whisper-server.py &
```

### Bygg ny APK
```bash
cd /home/ai-server/simons-ai-app/android
ANDROID_HOME=/home/ai-server/android-sdk \
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
./gradlew assembleRelease

# Kopiera till download-server
cp app/build/outputs/apk/release/app-release.apk /home/ai-server/simons-ai.apk
```

### Ladda ner APK till telefon
```
http://192.168.86.26:8888/simons-ai.apk
```

## Agenter

| Agent | Modell | Server |
|-------|--------|--------|
| QWEN | qwen3:14b | Lokal (192.168.86.26) |
| NERDY | deepseek-r1:14b | Extern (192.168.86.27) |
