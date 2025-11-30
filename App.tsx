import { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Keyboard,
  Dimensions,
  Platform,
  Animated as RNAnimated,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import NetInfo from '@react-native-community/netinfo';

// ═══════════════════════════════════════════════════════════════
// DYNAMIC IDENTITY - Simons AI
// UI morphar baserat på vald agent
// ═══════════════════════════════════════════════════════════════

import { ThemeProvider, useTheme, AgentType } from './contexts/ThemeContext';
import ReactiveCore from './components/ReactiveCore';
import { ChatHistory } from './components/ChatBubble';
import InputZone from './components/InputZone';
import AgentToggle from './components/AgentToggle';
import ServerHealthWidget from './components/ServerHealthWidget';
import TerminalOutput from './components/TerminalOutput';
import QuickActions from './components/QuickActions';

const BACKEND_URL = 'http://192.168.86.26:8000';
const WHISPER_URL = 'http://192.168.86.26:8001';

// Shell command result type
type ShellResult = {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  requiresConfirmation?: boolean;
  message?: string;
};

// Voice command definitions with multiple trigger variations
const VOICE_COMMANDS = [
  {
    triggers: ['statusrapport', 'status rapport', 'startes rapport', 'startes rapportu', 'status rapportu', 'status report', 'visa status'],
    action: 'status'
  },
  {
    triggers: ['starta om backend', 'restart backend', 'starta backend', 'omstart backend', 'restarta backend'],
    action: 'restart_backend'
  },
  {
    triggers: ['starta om frontend', 'restart frontend', 'starta frontend', 'omstart frontend'],
    action: 'restart_frontend'
  },
  {
    triggers: ['deploya', 'deploy', 'delpoya', 'publicera', 'uppdatera'],
    action: 'deploy'
  },
];

// Fuzzy command matcher - checks if any trigger is contained in the transcribed text
const matchVoiceCommand = (transcribedText: string): string | null => {
  const text = transcribedText.toLowerCase().trim();

  for (const cmd of VOICE_COMMANDS) {
    for (const trigger of cmd.triggers) {
      // Check if trigger words are in the text (fuzzy)
      const triggerWords = trigger.split(' ');
      const matchCount = triggerWords.filter(word => text.includes(word)).length;

      // If most words match, consider it a match (60% threshold)
      if (matchCount >= Math.ceil(triggerWords.length * 0.6)) {
        return cmd.action;
      }
    }
  }
  return null;
};

// Check if input is a shell command (starts with $)
const isShellCommand = (text: string): boolean => {
  return text.trim().startsWith('$');
};

// Types
type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type CoreState = 'idle' | 'listening' | 'processing';

// ═══════════════════════════════════════════════════════════════
// LOADING ANIMATION
// ═══════════════════════════════════════════════════════════════

function LoadingIndicator() {
  const { theme, currentAgent } = useTheme();
  const opacityAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const text = currentAgent === 'qwen' ? 'QWEN analyserar...' : 'NERDY analyserar...';

  return (
    <RNAnimated.Text
      style={[
        styles.loadingText,
        {
          opacity: opacityAnim,
          color: theme.colors.accent,
          fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
        },
      ]}
    >
      {text}
    </RNAnimated.Text>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP CONTENT
// ═══════════════════════════════════════════════════════════════

function AppContent() {
  const { theme, currentAgent, setAgent, animatedColors } = useTheme();

  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [shellResult, setShellResult] = useState<ShellResult | null>(null);
  const [showHealthWidget, setShowHealthWidget] = useState(true);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Determine ReactiveCore state
  const coreState: CoreState = isRecording ? 'listening' : isProcessing ? 'processing' : 'idle';

  // Begär mikrofon-permission vid start
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('MIKROFON NEKAD');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Execute shell command
  const executeShellCommand = useCallback(async (cmd: string, confirmed: boolean = false) => {
    setIsProcessing(true);
    setError('');
    setShellResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shell/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          confirmed,
        }),
      });

      const data = await res.json();

      if (data.requires_confirmation) {
        // Store pending command for confirmation
        setPendingCommand(cmd);
        setError(currentAgent === 'qwen'
          ? `BEKRÄFTA: ${data.message}`
          : `Bekräfta: ${data.message}`);
        setIsProcessing(false);
        return;
      }

      setShellResult({
        command: data.command || cmd,
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitCode: data.exit_code ?? -1,
        durationMs: data.duration_ms || 0,
      });

      setCommand('');
      setPendingCommand(null);
    } catch (e: any) {
      setError(currentAgent === 'qwen' ? 'SHELL-FEL' : 'Shell error');
    } finally {
      setIsProcessing(false);
    }
  }, [currentAgent]);

  // Confirm pending dangerous command
  const confirmPendingCommand = useCallback(async () => {
    if (pendingCommand) {
      setError('');
      await executeShellCommand(pendingCommand, true);
    }
  }, [pendingCommand, executeShellCommand]);

  // Cancel pending command
  const cancelPendingCommand = useCallback(() => {
    setPendingCommand(null);
    setError('');
  }, []);

  // Check for voice commands using fuzzy matching
  const checkVoiceCommand = useCallback((text: string): boolean => {
    const matchedAction = matchVoiceCommand(text);

    if (!matchedAction) {
      return false;
    }

    // Execute action based on match
    switch (matchedAction) {
      case 'status':
        setShowHealthWidget(true);
        return true;

      case 'restart_backend':
        executeShellCommand('sudo systemctl restart simons-ai-backend', false);
        return true;

      case 'restart_frontend':
        executeShellCommand('sudo systemctl restart simons-ai-frontend', false);
        return true;

      case 'deploy':
        // Add deploy logic here if needed
        setError(currentAgent === 'qwen' ? 'DEPLOY EJ IMPLEMENTERAD' : 'Deploy inte implementerad');
        return true;

      default:
        return false;
    }
  }, [executeShellCommand, currentAgent]);

  // Command execution
  const executeCommand = useCallback(async () => {
    if (!command.trim() || isProcessing) return;

    const userMessage = command.trim();
    Keyboard.dismiss();

    // Check if it's a shell command
    if (isShellCommand(userMessage)) {
      await executeShellCommand(userMessage);
      return;
    }

    // Check for voice commands in text
    if (checkVoiceCommand(userMessage)) {
      setCommand('');
      return;
    }

    setIsProcessing(true);
    setError('');
    setTranscribedText('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/voice-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userMessage,
          profile: currentAgent,
        }),
      });

      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setIsProcessing(false);
        return;
      }

      const data = await res.json();
      const aiResponse = data.response || 'INGEN RESPONS';

      // Add to history
      setHistory(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse },
      ]);

      // TTS if enabled
      if (ttsEnabled && aiResponse) {
        Speech.speak(aiResponse, { language: 'sv-SE' });
      }

      setCommand('');
    } catch (e: any) {
      setError('ANSLUTNINGSFEL');
    } finally {
      setIsProcessing(false);
    }
  }, [command, isProcessing, currentAgent, ttsEnabled, executeShellCommand, checkVoiceCommand]);

  // ═══════════════════════════════════════════════════════════════
  // RÖSTINSPELNING
  // ═══════════════════════════════════════════════════════════════

  const startRecording = async () => {
    try {
      setError('');
      setTranscribedText('');

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      setError('KAN INTE STARTA INSPELNING');
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setError('INGEN LJUDFIL');
        setIsProcessing(false);
        return;
      }

      // Skicka till Whisper-server med vald agent
      const formData = new FormData();
      formData.append('audio', {
        uri: uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('profile', currentAgent);

      const whisperRes = await fetch(`${WHISPER_URL}/voice-command`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await whisperRes.json();

      if (data.success) {
        setTranscribedText(data.transcribed_text || '');

        // Add to history
        const userText = data.transcribed_text || '';
        const aiResponse = data.response || 'INGET SVAR';

        setHistory(prev => [
          ...prev,
          { role: 'user', content: userText },
          { role: 'assistant', content: aiResponse },
        ]);

        // TTS if enabled
        if (ttsEnabled && aiResponse) {
          Speech.speak(aiResponse, { language: 'sv-SE' });
        }
      } else {
        setError(data.error || 'TRANSKRIBERING MISSLYCKADES');
      }
    } catch (err: any) {
      setError('SERVER-FEL: ' + (err.message || 'OKÄNT'));
      console.error('Recording error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // QUICK ACTIONS HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleStatusPress = useCallback(() => {
    setShowHealthWidget(prev => !prev);
  }, []);

  const handleRestartPress = useCallback(async () => {
    // Show confirmation and restart backend
    await executeShellCommand('sudo systemctl restart simons-ai-backend', false);
  }, [executeShellCommand]);

  const handleDeployPress = useCallback(() => {
    // For now, show alert - can be expanded later
    setError(currentAgent === 'qwen' ? 'DEPLOY EJ IMPLEMENTERAD' : 'Deploy inte implementerad');
  }, [currentAgent]);

  const handleShellPress = useCallback(() => {
    // Prefill input with shell prompt
    setCommand('$ ');
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <RNAnimated.View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <StatusBar style="light" />

      {/* ═══ OFFLINE INDICATOR ═══ */}
      {isOffline && (
        <View
          style={[
            styles.offlineBanner,
            {
              backgroundColor: '#ef4444',
              borderRadius: theme.borderRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.offlineText,
              { fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined },
            ]}
          >
            {currentAgent === 'qwen' ? '⚠ OFFLINE' : '⚠ Offline'}
          </Text>
        </View>
      )}

      {/* ═══ AGENT TOGGLE ═══ */}
      <AgentToggle disabled={isProcessing || isRecording} />

      {/* ═══ SERVER HEALTH WIDGET ═══ */}
      {showHealthWidget && currentAgent === 'qwen' && (
        <ServerHealthWidget initialExpanded={false} />
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <QuickActions
        onStatusPress={handleStatusPress}
        onRestartPress={handleRestartPress}
        onDeployPress={handleDeployPress}
        onShellPress={handleShellPress}
      />

      {/* ═══ REACTIVE CORE ═══ */}
      <View style={styles.coreSection} pointerEvents="none">
        <ReactiveCore agent={currentAgent} state={coreState} />
        {isRecording && (
          <Text
            style={[
              styles.stateLabel,
              {
                color: theme.colors.accent,
                fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
              },
            ]}
          >
            {currentAgent === 'qwen' ? 'SPELAR IN...' : 'Spelar in...'}
          </Text>
        )}
        {isProcessing && !isRecording && <LoadingIndicator />}
      </View>

      {/* ═══ TERMINAL OUTPUT ═══ */}
      {shellResult && (
        <TerminalOutput
          command={shellResult.command}
          output={shellResult.stdout}
          error={shellResult.stderr}
          exitCode={shellResult.exitCode}
          durationMs={shellResult.durationMs}
          onClose={() => setShellResult(null)}
        />
      )}

      {/* ═══ ERROR DISPLAY ═══ */}
      {error && (
        <View
          style={[
            styles.errorContainer,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius,
              borderColor: pendingCommand ? theme.colors.accent : '#ef4444',
            },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              {
                color: pendingCommand ? theme.colors.accent : '#ef4444',
                fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
              },
            ]}
          >
            {error}
          </Text>

          {/* Confirmation buttons for dangerous commands */}
          {pendingCommand && (
            <View style={styles.confirmButtons}>
              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: theme.colors.accent, borderRadius: theme.borderRadius },
                ]}
                onPress={confirmPendingCommand}
              >
                <Text style={[styles.confirmButtonText, { color: theme.colors.background }]}>
                  {currentAgent === 'qwen' ? 'BEKRÄFTA' : 'Bekräfta'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  styles.cancelButton,
                  { borderColor: theme.colors.dimmed, borderRadius: theme.borderRadius },
                ]}
                onPress={cancelPendingCommand}
              >
                <Text style={[styles.confirmButtonText, { color: theme.colors.dimmed }]}>
                  {currentAgent === 'qwen' ? 'AVBRYT' : 'Avbryt'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* ═══ TRANSCRIBED TEXT ═══ */}
      {transcribedText && !error && (
        <View
          style={[
            styles.transcribedContainer,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.transcribedText,
              {
                color: theme.colors.accent,
                fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
              },
            ]}
          >
            "{transcribedText}"
          </Text>
        </View>
      )}

      {/* ═══ CHAT HISTORY ═══ */}
      <View
        style={[
          styles.chatSection,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.dimmed,
            borderRadius: theme.borderRadius,
          },
        ]}
      >
        {history.length > 0 ? (
          <ChatHistory messages={history} />
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyText,
                {
                  color: theme.colors.dimmed,
                  fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
                },
              ]}
            >
              {currentAgent === 'qwen' ? '// VÄNTAR PÅ INPUT' : 'Väntar på meddelande...'}
            </Text>
          </View>
        )}
      </View>

      {/* ═══ INPUT ZONE ═══ */}
      <InputZone
        value={command}
        onChangeText={setCommand}
        onSubmit={executeCommand}
        onMicPress={toggleRecording}
        isRecording={isRecording}
        isProcessing={isProcessing}
      />

      {/* ═══ STATUS BAR ═══ */}
      <View style={styles.statusBar}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isRecording
                ? '#ef4444'
                : isProcessing
                ? theme.colors.accent
                : '#22c55e',
            },
          ]}
        />
        <Text
          style={[
            styles.statusText,
            {
              color: theme.colors.dimmed,
              fontFamily: theme.typography === 'monospace' ? 'monospace' : undefined,
            },
          ]}
        >
          {isRecording
            ? currentAgent === 'qwen'
              ? 'SPELAR IN'
              : 'Spelar in'
            : isProcessing
            ? currentAgent === 'qwen'
              ? 'BEARBETAR'
              : 'Bearbetar'
            : currentAgent === 'qwen'
            ? 'REDO'
            : 'Redo'}
        </Text>
      </View>
    </RNAnimated.View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP WITH THEME PROVIDER
// ═══════════════════════════════════════════════════════════════

export default function App() {
  return (
    <ThemeProvider initialAgent="qwen">
      <AppContent />
    </ThemeProvider>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  offlineBanner: {
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  coreSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    marginBottom: 10,
  },
  stateLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 10,
    letterSpacing: 2,
  },
  loadingText: {
    position: 'absolute',
    bottom: 0,
    fontSize: 10,
    letterSpacing: 2,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  transcribedContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
  },
  transcribedText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  chatSection: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
