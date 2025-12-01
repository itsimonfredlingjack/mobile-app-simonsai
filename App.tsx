import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Send, Terminal, Cpu, Activity, Wifi, RefreshCw } from 'lucide-react-native';

import { useWarRoomSocket } from './src/hooks/useWarRoomSocket';
import { useVoiceInput } from './src/hooks/useVoiceInput';

// --- THEME ---
const THEME = {
  bg: '#050B14',
  accent: '#00F3FF',
  secondary: '#0A1A2F',
  danger: '#FF2A6D',
  success: '#34d399',
  text: '#E0E6ED',
  textDim: '#445566',
  glass: 'rgba(10, 26, 47, 0.8)',
};

// --- INTERFACES ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// --- COMPONENT: MINI MONOLITH (80px Avatar) ---
const MiniMonolith = ({ active, size = 80 }: { active: boolean; size?: number }) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: active ? 3000 : 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [active, rotateValue]);

  useEffect(() => {
    if (active) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, { toValue: 1.1, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseValue, { toValue: 1.0, duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseValue.setValue(1);
    }
  }, [active, pulseValue]);

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const Plane = ({ rotateVal, color, planeSize }: { rotateVal: any; color: string; planeSize: number }) => (
    <Animated.View
      style={[
        styles.plane,
        {
          width: planeSize,
          height: planeSize,
          borderColor: color,
          transform: [
            { rotateX: '45deg' },
            { rotateY: rotateVal },
            { rotateZ: rotateVal },
            { scale: pulseValue },
          ],
        },
      ]}
    />
  );

  return (
    <View style={[styles.miniMonolith, { width: size, height: size }]}>
      <Plane rotateVal={spin} color={THEME.accent} planeSize={size * 0.9} />
      <Plane
        rotateVal={rotateValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] })}
        color="rgba(0, 243, 255, 0.4)"
        planeSize={size * 0.65}
      />
      <Plane
        rotateVal={rotateValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })}
        color="rgba(0, 243, 255, 0.2)"
        planeSize={size * 0.4}
      />
      <View style={[styles.miniCore, active && styles.miniCoreActive, { width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075 }]} />
    </View>
  );
};

// --- COMPONENT: SYSTEM HUD ---
const SystemHUD = ({ isConnected, onReconnect }: { isConnected: boolean; onReconnect: () => void }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.hudContainer, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity style={styles.hudLeft} onPress={onReconnect}>
        <Activity size={14} color={isConnected ? THEME.accent : THEME.danger} />
        <Text style={[styles.hudText, !isConnected && { color: THEME.danger }]}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </TouchableOpacity>
      <View style={styles.hudCenter}>
        <View style={styles.agentBadge}>
          <Cpu size={12} color="#000" />
          <Text style={styles.agentText}>QWEN 3</Text>
        </View>
      </View>
      <View style={styles.hudRight}>
        <Text style={[styles.hudText, !isConnected && { color: THEME.danger }]}>
          NET: {isConnected ? 'UP' : 'DOWN'}
        </Text>
        <Wifi size={14} color={isConnected ? THEME.accent : THEME.danger} />
      </View>
    </View>
  );
};

// --- COMPONENT: ERROR TOAST ---
const ErrorToast = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
  <View style={styles.errorToast}>
    <Text style={styles.errorText}>⚠️ {message}</Text>
    <TouchableOpacity onPress={onDismiss} style={styles.errorDismiss}>
      <Text style={styles.errorDismissText}>✕</Text>
    </TouchableOpacity>
  </View>
);

// --- MAIN APP CONTENT ---
const AppContent = () => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [wsKey, setWsKey] = useState(0); // For reconnect
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hooks
  const {
    isConnected,
    isStreaming,
    isSending,
    streamingText,
    sendMessage: socketSendMessage,
  } = useWarRoomSocket({
    onMessageComplete: (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
        },
      ]);
    },
    onError: (error: string) => {
      setErrorMessage(error);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const [lastTranscription, setLastTranscription] = useState<string | null>(null);

  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceInput({
    onTranscriptionComplete: (text: string) => {
      console.log('[APP] Voice transcription received:', text);
      if (text.trim()) {
        setLastTranscription(text);  // Visa vad som hördes
        handleSendMessage(text);
        // Rensa efter 3 sekunder
        setTimeout(() => setLastTranscription(null), 3000);
      }
    },
    onError: (error: string) => {
      console.error('[APP] Voice error:', error);
      setErrorMessage(error);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const isActive = isRecording || isTranscribing || isSending || isStreaming;

  // Get current status text for UI
  const getStatusText = () => {
    if (isRecording) return '🔴 Recording...';
    if (isTranscribing) return '🎤 Processing voice...';
    if (lastTranscription) return `📝 Heard: "${lastTranscription.slice(0, 30)}..."`;
    if (isSending) return '📤 Sending to QWEN...';
    if (isStreaming) return '💬 QWEN is responding...';
    return 'Ready';
  };

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, streamingText]);

  const handleSendMessage = useCallback((text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    socketSendMessage(trimmedText);
    setInputText('');
    setShowInput(false);
    Keyboard.dismiss();
  }, [socketSendMessage]);

  const handleMicPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleReconnect = useCallback(() => {
    setWsKey(prev => prev + 1);
    Alert.alert('Reconnecting', 'Attempting to reconnect to server...');
  }, []);

  const handleCmd = useCallback(() => {
    Alert.alert(
      'QWEN Tools',
      'Select action:',
      [
        {
          text: 'Reconnect',
          onPress: handleReconnect
        },
        {
          text: 'Clear Chat',
          onPress: () => setMessages([])
        },
        {
          text: 'Server Info',
          onPress: () => Alert.alert('Server', `Status: ${isConnected ? 'Connected' : 'Disconnected'}\nIP: 192.168.86.26:8000`)
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handleReconnect, isConnected]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

      {/* Error Toast */}
      {errorMessage && (
        <ErrorToast message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* 1. TOP HUD */}
      <SystemHUD isConnected={isConnected} onReconnect={handleReconnect} />

      {/* 2. MAIN CONTENT - Chat ScrollView with flex:1 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Row with Mini-Monolith */}
        <View style={styles.avatarRow}>
          <MiniMonolith active={isActive} size={80} />
          <View style={styles.avatarInfo}>
            <Text style={styles.terminalTitle}>QWEN 3 // TERMINAL</Text>
            <Text style={styles.terminalSubtitle}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Welcome message if empty */}
        {messages.length === 0 && !streamingText && (
          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeText}>
              <Text style={{ color: THEME.accent }}>{'>'} </Text>
              Initializing QWEN core...
            </Text>
            <Text style={[styles.welcomeText, { color: THEME.textDim }]}>
              ... Connection {isConnected ? 'established' : 'pending'}
            </Text>
            <Text style={[styles.welcomeText, { color: THEME.textDim }]}>
              ... Press MIC to speak or Terminal to type
            </Text>
          </View>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <View key={msg.id} style={styles.messageRow}>
            <Text style={styles.messageText}>
              <Text style={{ color: msg.role === 'user' ? THEME.success : THEME.accent }}>
                {msg.role === 'user' ? '> ' : 'QWEN > '}
              </Text>
              {msg.content}
            </Text>
          </View>
        ))}

        {/* Streaming Response */}
        {streamingText && (
          <View style={styles.messageRow}>
            <Text style={styles.messageText}>
              <Text style={{ color: THEME.accent }}>QWEN {'>'} </Text>
              {streamingText}
              <Text style={{ color: THEME.accent }}>_</Text>
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 3. CONTROL DECK - Fixed at bottom with safe area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.controlDeck, { paddingBottom: insets.bottom + 10 }]}>
          {/* Voice Status Indicator */}
          {(isRecording || isTranscribing || lastTranscription) && (
            <View style={styles.voiceStatusBar}>
              <Text style={styles.voiceStatusText}>
                {isRecording ? '🔴 RECORDING...' :
                 isTranscribing ? '🎤 PROCESSING...' :
                 lastTranscription ? `📝 "${lastTranscription}"` : ''}
              </Text>
            </View>
          )}

          {/* Input Field (shown when active) */}
          {showInput && (
            <View style={styles.inputRow}>
              <Terminal size={18} color={THEME.accent} />
              <TextInput
                style={styles.textInput}
                placeholder="Type command..."
                placeholderTextColor={THEME.textDim}
                value={inputText}
                onChangeText={setInputText}
                autoFocus={true}
                onSubmitEditing={() => handleSendMessage(inputText)}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={() => handleSendMessage(inputText)}
                disabled={!inputText.trim()}
              >
                <Send size={18} color="#000" />
              </TouchableOpacity>
            </View>
          )}

          {/* Button Row - Always visible */}
          <View style={styles.buttonRow}>
            {/* Terminal Toggle */}
            <TouchableOpacity
              style={[styles.sideBtn, showInput && styles.sideBtnActive]}
              onPress={() => {
                setShowInput(!showInput);
                if (showInput) Keyboard.dismiss();
              }}
            >
              <Terminal size={24} color={showInput ? '#000' : THEME.accent} />
            </TouchableOpacity>

            {/* MIC Button (Hero) */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
                (isSending || isStreaming) && styles.micButtonActive
              ]}
              onPress={handleMicPress}
              activeOpacity={0.8}
              disabled={isTranscribing || isStreaming || isSending}
            >
              <View style={[styles.micInner, isRecording && styles.micInnerActive]}>
                <Mic size={32} color={isRecording ? THEME.danger : THEME.accent} />
              </View>
              {(isTranscribing || isSending) && (
                <RefreshCw size={16} color={THEME.accent} style={styles.processingIcon} />
              )}
            </TouchableOpacity>

            {/* CMD Button */}
            <TouchableOpacity style={styles.sideBtn} onPress={handleCmd}>
              <Text style={styles.cmdText}>CMD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// --- MAIN APP ---
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  // HUD
  hudContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 243, 255, 0.15)',
    backgroundColor: THEME.bg,
  },
  hudLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hudCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center', top: undefined },
  hudText: {
    color: THEME.accent,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    fontWeight: '600',
  },
  agentBadge: {
    flexDirection: 'row',
    backgroundColor: THEME.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    alignItems: 'center',
  },
  agentText: { color: '#000', fontWeight: 'bold', fontSize: 10 },

  // CHAT CONTAINER (flex: 1 - takes all available space)
  chatContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // AVATAR ROW
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 243, 255, 0.1)',
  },
  avatarInfo: {
    marginLeft: 16,
    flex: 1,
  },
  terminalTitle: {
    color: THEME.accent,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
  terminalSubtitle: {
    color: THEME.textDim,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },

  // MINI MONOLITH
  miniMonolith: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plane: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  miniCore: {
    backgroundColor: THEME.accent,
    opacity: 0.3,
  },
  miniCoreActive: {
    opacity: 1,
    shadowColor: THEME.accent,
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },

  // WELCOME BOX
  welcomeBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 2,
    borderLeftColor: THEME.accent,
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  welcomeText: {
    color: THEME.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },

  // MESSAGES
  messageRow: {
    marginBottom: 12,
  },
  messageText: {
    color: THEME.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    lineHeight: 22,
  },

  // CONTROL DECK (fixed at bottom)
  controlDeck: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(5, 11, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 243, 255, 0.2)',
  },

  // INPUT ROW
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 26, 47, 0.9)',
    borderWidth: 1,
    borderColor: THEME.accent,
    borderRadius: 25,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(0, 243, 255, 0.3)',
  },

  // BUTTON ROW
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // SIDE BUTTONS
  sideBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.3)',
    backgroundColor: 'rgba(5, 11, 20, 0.9)',
  },
  sideBtnActive: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent,
  },
  cmdText: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // MIC BUTTON (Hero)
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: 'rgba(0, 243, 255, 0.2)',
    borderColor: '#FFF',
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
  },
  micInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micInnerActive: {
    backgroundColor: 'rgba(255, 42, 109, 0.3)',
  },
  processingIcon: {
    position: 'absolute',
    bottom: -8,
  },

  // ERROR TOAST
  errorToast: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 42, 109, 0.95)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    shadowColor: THEME.danger,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  errorText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  errorDismiss: {
    marginLeft: 10,
    padding: 4,
  },
  errorDismissText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // MIC RECORDING STATE (red ring)
  micButtonRecording: {
    borderColor: THEME.danger,
    borderWidth: 3,
    backgroundColor: 'rgba(255, 42, 109, 0.2)',
  },

  // VOICE STATUS BAR
  voiceStatusBar: {
    backgroundColor: 'rgba(0, 243, 255, 0.15)',
    borderWidth: 1,
    borderColor: THEME.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  voiceStatusText: {
    color: THEME.accent,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
});
