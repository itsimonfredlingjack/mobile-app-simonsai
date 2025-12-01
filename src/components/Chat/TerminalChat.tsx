import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS } from '../../constants/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface TerminalChatProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onVoicePress: () => void;
  isRecording: boolean;
  streamingText: string;
}

export const TerminalChat: React.FC<TerminalChatProps> = ({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onVoicePress,
  isRecording,
  streamingText,
}) => {
  const isProcessing = !!streamingText;
  const scrollViewRef = useRef<ScrollView>(null);
  const [cursorVisible, setCursorVisible] = React.useState(true);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Blinking cursor effect
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setCursorVisible((prev) => !prev);
      }, 530);
      return () => clearInterval(interval);
    } else {
      setCursorVisible(true);
    }
  }, [isProcessing]);

  const handleSend = () => {
    if (inputValue.trim() && !isProcessing) {
      onSendMessage();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotRed]} />
            <View style={[styles.dot, styles.dotYellow]} />
            <View style={[styles.dot, styles.dotGreen]} />
          </View>
          <Text style={styles.headerText}>QWEN // TERMINAL</Text>
        </View>
        <View style={[styles.statusDot, isProcessing && styles.statusDotActive]} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View key={message.id} style={styles.messageRow}>
            <Text
              style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {message.role === 'user' ? '> ' : 'QWEN > '}
              {message.content}
            </Text>
          </View>
        ))}

        {/* Streaming response */}
        {streamingText && (
          <View style={styles.messageRow}>
            <Text style={styles.assistantText}>
              QWEN &gt; {streamingText}{cursorVisible ? '_' : ''}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
          onPress={onVoicePress}
          disabled={isProcessing}
        >
          <Text style={styles.voiceButtonText}>{isRecording ? 'STOP' : 'MIC'}</Text>
        </TouchableOpacity>
        <Text style={styles.inputPrefix}>&gt;</Text>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={onInputChange}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.glass.border}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!isProcessing && !isRecording}
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputValue.trim() || isProcessing) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputValue.trim() || isProcessing}
        >
          <Text style={styles.sendButtonText}>SEND</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.void_black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotRed: {
    backgroundColor: '#ff5f56',
  },
  dotYellow: {
    backgroundColor: '#ffbd2e',
  },
  dotGreen: {
    backgroundColor: '#27c93f',
  },
  headerText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: COLORS.cyberpunk_blue,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.glass.border,
  },
  statusDotActive: {
    backgroundColor: COLORS.emerald,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: COLORS.emerald,
  },
  assistantText: {
    color: COLORS.cyberpunk_blue,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.glass.border,
    gap: 8,
  },
  voiceButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 243, 255, 0.2)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cyberpunk_blue,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  voiceButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.cyberpunk_blue,
    fontWeight: '700',
  },
  inputPrefix: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: COLORS.emerald,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    color: COLORS.emerald,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.cyberpunk_blue,
    borderRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.glass.border,
    opacity: 0.5,
  },
  sendButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.void_black,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
